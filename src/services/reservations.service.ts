import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reservation, ReservationDocument } from '@models/reservations/reservation.schema';
import { CreateReservationDto } from '@models/reservations/dto/create-reservation.dto';
import { RedisService } from '@config/redis.service';
import { PdfService } from '@services/pdf.service';
import { EmailService } from '@services/email.service';
import { GuestsService } from '@services/guests.service';
import { CreateGuestDto } from '@models/guests/dto/guest.dto';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectModel(Reservation.name) 
    private reservationModel: Model<ReservationDocument>,
    private redisService: RedisService,
    private pdfService: PdfService,
    private emailService: EmailService,
    private guestsService: GuestsService
  ) {}

  async create(createReservationDto: CreateReservationDto): Promise<Reservation> {
    // 🔍 VALIDAR DUPLICADOS DE DOCUMENTOS
    if (createReservationDto.guests && createReservationDto.guests.length > 0) {
      await this.validateDocumentDuplicates(createReservationDto.guests);
    }

    // Normalizar y completar campos requeridos por el esquema
    let guestCount = Number(
      createReservationDto.guestCount ?? (createReservationDto.guests?.length ?? 1)
    );
    if (!Number.isFinite(guestCount) || guestCount < 1) guestCount = 1;

    let maxCapacity = Number(createReservationDto.maxCapacity ?? guestCount);
    if (!Number.isFinite(maxCapacity) || maxCapacity < 1) maxCapacity = guestCount;
    // Asegurar coherencia
    if (guestCount > maxCapacity) guestCount = maxCapacity;

    const createdReservation = new this.reservationModel({
      ...createReservationDto,
      userId: new Types.ObjectId(createReservationDto.userId),
      roomId: new Types.ObjectId(createReservationDto.roomId),
      checkInDate: new Date(createReservationDto.checkInDate),
      checkOutDate: new Date(createReservationDto.checkOutDate),
      guestCount,
      maxCapacity,
      serviceIds: createReservationDto.serviceIds?.map(id => new Types.ObjectId(id)) || []
    });
    
    const savedReservation = await createdReservation.save();
    
    // 🧾 Registrar huéspedes asociados a la reserva (si vienen en el DTO)
    if (createReservationDto.guests && createReservationDto.guests.length > 0) {
      try {
        const guestsPayload: CreateGuestDto[] = createReservationDto.guests.map((g: any) => ({
          reservationId: savedReservation._id.toString(),
          isMainGuest: Boolean(g.isMainGuest),
          documentType: g.documentType,
          documentNumber: g.documentNumber,
          firstName: g.firstName,
          lastName: g.lastName,
          birthDate: new Date(g.birthDate).toISOString(),
          nationality: g.nationality,
          phoneNumber: g.phoneNumber,
          email: g.email,
          isCompleted: g.isCompleted ?? true,
        }));
        await Promise.all(guestsPayload.map(payload => this.guestsService.create(payload)));
        console.log('👥 Huéspedes registrados para la reserva:', guestsPayload.length);
      } catch (err) {
        console.error('❌ Error registrando huéspedes de la reserva:', err);
        // No interrumpir el flujo principal
      }
    }

    // Invalidar cache de Redis para la habitación afectada
    await this.redisService.invalidateRoomCache(createReservationDto.roomId);
    await this.redisService.invalidateAvailableRoomsCache();
    
    // 🚀 MÉTRICAS EN TIEMPO REAL: Actualizar contadores
    const today = new Date().toISOString().split('T')[0];
    await this.redisService.incrementDailyReservations(today);
    await this.redisService.addDailyRevenue(today, createReservationDto.totalPrice);
    await this.redisService.incrementOccupiedRooms();
    
    // Métricas adicionales por categoría de habitación
    const room = await this.reservationModel.findById(savedReservation._id).populate('roomId').exec();
    if (room?.roomId) {
      const categoryId = (room.roomId as any).categoryId;
      if (categoryId) {
        await this.redisService.incrementDailyReservations(`${today}:category:${categoryId}`);
        console.log('📊 Métricas por categoría actualizadas:', categoryId);
      }
    }
    
    console.log('🗑️ Cache invalidado para habitación:', createReservationDto.roomId);
    console.log('📊 Métricas actualizadas para nueva reserva');
    console.log('💰 Ingreso registrado: $' + createReservationDto.totalPrice);
    
    // 📧 ENVÍO DE EMAIL CON PDF (incluye huéspedes registrados)
    try {
      const reservationWithDetails = await this.reservationModel
        .findById(savedReservation._id)
        .populate('userId')
        .populate('roomId')
        .exec();

      if (reservationWithDetails && reservationWithDetails.userId) {
        const userEmail = (reservationWithDetails.userId as any).email;
        if (userEmail) {
          // Cargar huéspedes asociados a la reserva y adjuntarlos al objeto a enviar al email
          const guests = await this.guestsService.findByReservation(savedReservation._id.toString());
          const reservationPayload = JSON.parse(JSON.stringify(reservationWithDetails));
          reservationPayload.guests = (guests || []).map((g: any) => ({
            firstName: g.firstName,
            lastName: g.lastName,
            documentType: g.documentType?.name || g.documentType,
            documentNumber: g.documentNumber,
            nationality: g.nationality,
            phoneNumber: g.phoneNumber,
            email: g.email,
            isMainGuest: g.isMainGuest,
          }));

          await this.emailService.sendReservationConfirmation(reservationPayload, userEmail);
          console.log('📧 Email de confirmación enviado a:', userEmail);
        }
      }
    } catch (error) {
      console.error('❌ Error enviando email de confirmación:', error);
      // No lanzamos el error para no interrumpir la creación de la reserva
    }
    
    return savedReservation;
  }

  async findAll(): Promise<Reservation[]> {
    return this.reservationModel.find().populate('userId').populate('roomId').exec();
  }

  async findByUser(userId: string): Promise<Reservation[]> {
    console.log('🔍 Buscando reservas para userId:', userId);
    const objectId = new Types.ObjectId(userId);
    console.log('🔍 ObjectId convertido:', objectId);
    
    const reservations = await this.reservationModel
      .find({ userId: objectId })
      .populate('userId')
      .populate('roomId')
      .exec();
    
    console.log('📋 Reservas encontradas:', reservations.length);
    console.log('📋 Reservas:', reservations);
    
    return reservations;
  }

  async findOne(id: string): Promise<Reservation | null> {
    return this.reservationModel
      .findById(id)
      .populate('userId')
      .populate('roomId')
      .exec();
  }

  async update(id: string, updateData: Partial<Reservation>): Promise<Reservation | null> {
    return this.reservationModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('userId')
      .populate('roomId')
      .exec();
  }

  async remove(id: string): Promise<Reservation | null> {
    return this.reservationModel.findByIdAndDelete(id).exec();
  }

  async getReservationsByDateRange(startDate: Date, endDate: Date): Promise<Reservation[]> {
    return this.reservationModel
      .find({
        checkInDate: { $gte: startDate },
        checkOutDate: { $lte: endDate },
        status: { $in: ['confirmed', 'completed'] }
      })
      .populate('userId')
      .populate('roomId')
      .exec();
  }

  async getOccupiedDatesByRoom(roomId: string): Promise<any[]> {
    console.log('🔍 Buscando fechas ocupadas para roomId:', roomId);
    
    // 1. Intentar obtener del cache de Redis
    const cachedDates = await this.redisService.getCachedRoomOccupiedDates(roomId);
    if (cachedDates) {
      console.log('📅 Fechas ocupadas obtenidas del cache:', cachedDates);
      return cachedDates;
    }
    
    // 2. Si no hay cache, consultar la base de datos
    console.log('🗄️ Consultando base de datos...');
    const objectId = new Types.ObjectId(roomId);
    const reservations = await this.reservationModel
      .find({
        roomId: objectId,
        status: { $in: ['confirmed', 'pending'] } // Incluir reservas confirmadas y pendientes
      })
      .select('checkInDate checkOutDate status')
      .exec();
    
    console.log('📋 Reservas encontradas:', reservations.length);
    
    // Generar array de fechas ocupadas
    const occupiedDates: string[] = [];
    
    reservations.forEach(reservation => {
      const checkIn = new Date(reservation.checkInDate);
      const checkOut = new Date(reservation.checkOutDate);
      
      // Generar todas las fechas entre checkIn y checkOut (excluyendo checkOut)
      const currentDate = new Date(checkIn);
      while (currentDate < checkOut) {
        occupiedDates.push(currentDate.toISOString().split('T')[0]); // Formato YYYY-MM-DD
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    console.log('📅 Fechas ocupadas generadas:', occupiedDates);
    
    // 3. Guardar en cache de Redis (10 minutos)
    await this.redisService.cacheRoomOccupiedDates(roomId, occupiedDates, 600);
    
    return occupiedDates;
  }

  // 🔍 VALIDAR DUPLICADOS DE DOCUMENTOS
  private async validateDocumentDuplicates(guests: any[]): Promise<void> {
    console.log('🔍 Validando duplicados de documentos...');
    
    // Verificar duplicados dentro del mismo grupo de huéspedes
    const documentNumbers = guests.map(guest => guest.documentNumber).filter(Boolean);
    const uniqueNumbers = new Set(documentNumbers);
    
    if (documentNumbers.length !== uniqueNumbers.size) {
      throw new Error('No se permiten documentos duplicados en la misma reserva');
    }

    // Verificar duplicados en la base de datos
    for (const guest of guests) {
      if (guest.documentNumber) {
        const exists = await this.guestsService.checkDocumentExists(guest.documentNumber);
        if (exists) {
          throw new Error(`El documento ${guest.documentNumber} ya está registrado en el sistema`);
        }
      }
    }
    
    console.log('✅ Validación de duplicados completada');
  }
}
