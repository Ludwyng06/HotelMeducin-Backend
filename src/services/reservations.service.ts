import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reservation, ReservationDocument } from '@models/reservations/reservation.schema';
import { CreateReservationDto } from '@models/reservations/dto/create-reservation.dto';
import { RedisService } from '@config/redis.service';
import { PdfService } from '@services/pdf.service';
import { EmailService } from '@services/email.service';
import { GuestsService } from '@services/guests.service';
import { CreateGuestDto } from '@models/guests/dto/guest.dto';
import { Neo4jService } from '@services/neo4j.service';
import { NotificationsService } from '@modules/notifications/notifications.service';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectModel(Reservation.name) 
    private reservationModel: Model<ReservationDocument>,
    private redisService: RedisService,
    private pdfService: PdfService,
    private emailService: EmailService,
    private guestsService: GuestsService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => Neo4jService))
    private neo4jService: Neo4jService
  ) {}

  async create(createReservationDto: CreateReservationDto): Promise<Reservation> {
    // 🔍 VALIDAR DUPLICADOS DE DOCUMENTOS
    if (createReservationDto.guests && createReservationDto.guests.length > 0) {
      await this.validateDocumentDuplicates(createReservationDto.guests, createReservationDto.userId);
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
    
    // 🕸️ SINCRONIZACIÓN AUTOMÁTICA CON NEO4J EN TIEMPO REAL (ASÍNCRONO - NO BLOQUEA LA RESPUESTA)
    // Ejecutar inmediatamente pero sin bloquear
    (async () => {
      try {
        console.log('🕸️ [SYNC] ========== INICIANDO SINCRONIZACIÓN AUTOMÁTICA ==========');
        console.log('🕸️ [SYNC] Verificando Neo4j para sincronización automática...');
        console.log('🕸️ [SYNC] neo4jService disponible:', !!this.neo4jService);
        console.log('🕸️ [SYNC] Tipo de neo4jService:', typeof this.neo4jService);
        
        if (!this.neo4jService) {
          console.error('❌ [SYNC] Neo4jService no está disponible - NO SE SINCRONIZARÁ');
          return;
        }
        
        const isConnected = this.neo4jService.isConnected ? this.neo4jService.isConnected() : false;
        console.log('🕸️ [SYNC] Neo4j conectado:', isConnected);
        
        if (!isConnected) {
          console.warn('⚠️ [SYNC] Neo4j no está conectado, omitiendo sincronización');
          return;
        }
        
        console.log('🕸️ [SYNC] Iniciando sincronización automática con Neo4j...');
        console.log('🕸️ [SYNC] Reservación ID:', savedReservation._id.toString());
        
        // Obtener la reservación con todos los datos poblados
        const reservationForSync = await this.reservationModel
          .findById(savedReservation._id)
          .populate('userId')
          .populate('roomId')
          .lean()
          .exec();
        
        if (!reservationForSync) {
          console.warn('⚠️ [SYNC] No se pudo obtener la reservación para sincronizar');
          return;
        }
        
        console.log('🕸️ [SYNC] Reservación obtenida:', {
          id: reservationForSync._id,
          hasUserId: !!reservationForSync.userId,
          hasRoomId: !!reservationForSync.roomId
        });
        
        // Asegurar que el usuario esté sincronizado primero
        if (reservationForSync.userId) {
          const user = reservationForSync.userId as any;
          const userId = user._id?.toString() || user.id?.toString() || createReservationDto.userId?.toString();
          const userObj = {
            _id: userId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role || 'user',
            roleId: user.roleId
          };
          console.log('🕸️ [SYNC] Sincronizando usuario:', userObj._id);
          await this.neo4jService.syncUsersFromMongo([userObj]);
          console.log('✅ [SYNC] Usuario sincronizado en Neo4j:', userObj._id);
        }
        
        // Asegurar que la habitación esté sincronizada
        if (reservationForSync.roomId) {
          const room = reservationForSync.roomId as any;
          const roomId = room._id?.toString() || room.id?.toString() || createReservationDto.roomId?.toString();
          const roomObj = {
            _id: roomId,
            name: room.name,
            roomNumber: room.roomNumber,
            categoryId: room.categoryId,
            floor: room.floor,
            price: room.price || 0, // Agregar price
            capacity: room.capacity || 1, // Agregar capacity
            isAvailable: room.isAvailable,
            isMaintenance: room.isMaintenance
          };
          console.log('🕸️ [SYNC] Sincronizando habitación:', roomObj._id);
          await this.neo4jService.syncRoomsFromMongo([roomObj]);
          console.log('✅ [SYNC] Habitación sincronizada en Neo4j:', roomObj._id);
        }
        
        // Normalizar la reservación para la sincronización
        const userId = reservationForSync.userId?._id?.toString() || 
                      reservationForSync.userId?.id?.toString() || 
                      createReservationDto.userId?.toString();
        const roomId = reservationForSync.roomId?._id?.toString() || 
                      reservationForSync.roomId?.id?.toString() || 
                      createReservationDto.roomId?.toString();
        
        const normalizedReservation = {
          ...reservationForSync,
          userId: userId,
          roomId: roomId
        };
        
        console.log('🕸️ [SYNC] Sincronizando reservación:', {
          reservationId: normalizedReservation._id?.toString(),
          userId: userId,
          roomId: roomId
        });
        
        // Sincronizar la reservación con las relaciones
        await this.neo4jService.syncReservationsFromMongo([normalizedReservation]);
        console.log('🕸️ ✅ [SYNC] Reservación sincronizada automáticamente con Neo4j:', savedReservation._id.toString());
      } catch (error) {
        console.error('⚠️ [SYNC] Error sincronizando reservación con Neo4j (no crítico):', error);
        console.error('⚠️ [SYNC] Stack:', error instanceof Error ? error.stack : 'N/A');
        // No interrumpir el flujo principal si Neo4j falla
      }
    })().catch(err => {
      console.error('⚠️ [SYNC] Error no capturado en sincronización:', err);
    });
    
    // 📧 ENVÍO DE EMAIL CON PDF (ASÍNCRONO - NO BLOQUEA LA RESPUESTA)
    // Ejecutar en background sin bloquear la creación de la reserva
    setImmediate(async () => {
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
        console.error('❌ Error enviando email de confirmación (no bloquea la reserva):', error);
        // El error no afecta la creación de la reserva ya que se ejecuta en background
      }
    });

    // 🔔 NOTIFICACIÓN EN TIEMPO REAL (ASÍNCRONO)
    setImmediate(async () => {
      try {
        const reservationWithDetails = await this.reservationModel
          .findById(savedReservation._id)
          .populate('userId')
          .populate('roomId')
          .exec();

        if (reservationWithDetails) {
          // Notificar a administradores sobre nueva reservación
          await this.notificationsService.notifyNewReservation(reservationWithDetails);
          console.log('🔔 Notificación de nueva reservación enviada a administradores');
        }
      } catch (error) {
        console.error('❌ Error enviando notificación (no bloquea la reserva):', error);
      }
    });
    
    // Retornar inmediatamente sin esperar el envío de email o notificaciones
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

  /**
   * Cancelar una reserva (solo cambia el status, no elimina)
   * Verifica que el usuario solo pueda cancelar sus propias reservas
   */
  async cancel(id: string, userId: string): Promise<Reservation | null> {
    // Buscar la reserva y verificar que pertenece al usuario
    const reservation = await this.reservationModel.findById(id).exec();
    
    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Verificar que la reserva pertenece al usuario
    const reservationUserId = reservation.userId?.toString() || reservation.userId;
    const requestUserId = userId.toString();
    
    if (reservationUserId !== requestUserId) {
      throw new ForbiddenException('No tienes permisos para cancelar esta reserva');
    }

    // Verificar que la reserva no esté ya cancelada o completada
    if (reservation.status === 'cancelled' || reservation.status === 'CANCELLED') {
      throw new BadRequestException('La reserva ya está cancelada');
    }

    if (reservation.status === 'completed' || reservation.status === 'COMPLETED') {
      throw new BadRequestException('No se puede cancelar una reserva completada');
    }

    // Validar que no falten menos de 24 horas para el check-in
    const checkInDate = new Date(reservation.checkInDate);
    const now = new Date();
    const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilCheckIn < 24) {
      throw new BadRequestException(
        'No se puede cancelar una reserva con menos de 24 horas de anticipación al check-in'
      );
    }

    // Actualizar el status a 'cancelled' con información adicional
    const cancelledReservation = await this.reservationModel
      .findByIdAndUpdate(
        id,
        { 
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: 'Cancelada por el cliente'
        },
        { new: true }
      )
      .populate('userId')
      .populate('roomId')
      .exec();

    // Invalidar cache de la habitación
    if (cancelledReservation && cancelledReservation.roomId) {
      const roomId = (cancelledReservation.roomId as any)._id?.toString() || cancelledReservation.roomId.toString();
      await this.redisService.invalidateRoomCache(roomId);
      await this.redisService.invalidateAvailableRoomsCache();
      console.log('🗑️ Cache invalidado para habitación:', roomId);
    }

    console.log('✅ Reserva cancelada exitosamente:', id);
    return cancelledReservation;
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

  // 🔍 VALIDAR DUPLICADOS DE DOCUMENTOS, TELÉFONOS Y EMAILS
  private async validateDocumentDuplicates(guests: any[], userId: string): Promise<void> {
    console.log('🔍 Validando duplicados de documentos, teléfonos y emails...');
    
    // Verificar duplicados dentro del mismo grupo de huéspedes
    const documentNumbers = guests.map(guest => guest.documentNumber).filter(Boolean);
    const uniqueNumbers = new Set(documentNumbers);
    
    if (documentNumbers.length !== uniqueNumbers.size) {
      throw new Error('No se permiten documentos duplicados en la misma reserva');
    }

    // Verificar teléfonos duplicados dentro del mismo grupo
    const phoneNumbers = guests.map(guest => guest.phoneNumber).filter(Boolean);
    const uniquePhones = new Set(phoneNumbers);
    
    if (phoneNumbers.length !== uniquePhones.size) {
      throw new Error('No se permiten teléfonos duplicados en la misma reserva');
    }

    // Verificar emails duplicados dentro del mismo grupo
    const emails = guests.map(guest => guest.email).filter(Boolean);
    const uniqueEmails = new Set(emails);
    
    if (emails.length !== uniqueEmails.size) {
      throw new Error('No se permiten emails duplicados en la misma reserva');
    }

    // Verificar duplicados en la base de datos
    for (const guest of guests) {
      if (guest.documentNumber && guest.documentType) {
        const existingGuest = await this.guestsService.findByDocument(guest.documentNumber, guest.documentType);
        if (existingGuest) {
          // Verificar si el guest pertenece a una reserva del mismo usuario
          const reservation = await this.reservationModel.findById(existingGuest.reservationId).exec();
          if (reservation && reservation.userId.toString() !== userId) {
            throw new Error(`El documento ${guest.documentNumber} ya está registrado en el sistema`);
          }
          // Si pertenece al mismo usuario, permitir continuar
        }
      }

      if (guest.phoneNumber) {
        const existingGuest = await this.guestsService.findByPhone(guest.phoneNumber);
        if (existingGuest) {
          // Verificar si el guest pertenece a una reserva del mismo usuario
          const reservation = await this.reservationModel.findById(existingGuest.reservationId).exec();
          if (reservation && reservation.userId.toString() !== userId) {
            throw new Error(`El teléfono ${guest.phoneNumber} ya está registrado en el sistema`);
          }
          // Si pertenece al mismo usuario, permitir continuar
        }
      }

      if (guest.email) {
        const existingGuest = await this.guestsService.findByEmail(guest.email);
        if (existingGuest) {
          // Verificar si el guest pertenece a una reserva del mismo usuario
          const reservation = await this.reservationModel.findById(existingGuest.reservationId).exec();
          if (reservation && reservation.userId.toString() !== userId) {
            throw new Error(`El email ${guest.email} ya está registrado en el sistema`);
          }
          // Si pertenece al mismo usuario, permitir continuar
        }
      }
    }
    
    console.log('✅ Validación de duplicados completada');
  }

  /**
   * Confirmar una reserva (solo recepcionista)
   */
  async confirmReservation(
    reservationId: string,
    confirmedBy: string,
    paymentInfo?: { method?: string; notes?: string }
  ): Promise<Reservation> {
    const reservation = await this.reservationModel.findById(reservationId);
    
    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }
    
    if (reservation.status !== 'pending') {
      throw new BadRequestException('Solo se pueden confirmar reservas pendientes');
    }
    
    // Verificar que no haya pasado más de 1 hora si es reserva del mismo día
    const checkInDate = new Date(reservation.checkInDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkInDate.getTime() === today.getTime()) {
      // Reserva del mismo día - verificar que no haya pasado 1 hora
      const reservationTime = new Date((reservation as any).createdAt || reservation.checkInDate);
      const oneHourLater = new Date(reservationTime.getTime() + 60 * 60 * 1000);
      
      if (new Date() > oneHourLater) {
        throw new BadRequestException(
          'Han pasado más de 1 hora desde la creación. La reserva debe ser cancelada.'
        );
      }
    }
    
    // Validar método de pago
    if (paymentInfo?.method && !['efectivo', 'transferencia'].includes(paymentInfo.method)) {
      throw new BadRequestException('Método de pago inválido. Solo se permiten: efectivo o transferencia');
    }
    
    // Actualizar la reserva
    reservation.status = 'confirmed';
    reservation.confirmedBy = new Types.ObjectId(confirmedBy);
    reservation.confirmedAt = new Date();
    // Siempre asignar un método de pago (efectivo por defecto si no se proporciona)
    reservation.paymentMethod = paymentInfo?.method || 'efectivo';
    if (paymentInfo?.notes) {
      reservation.paymentNotes = paymentInfo.notes;
    }
    
    const savedReservation = await reservation.save();
    
    // Invalidar cache de la habitación
    if (savedReservation.roomId) {
      const roomId = (savedReservation.roomId as any)._id?.toString() || savedReservation.roomId.toString();
      await this.redisService.invalidateRoomCache(roomId);
      await this.redisService.invalidateAvailableRoomsCache();
    }
    
    console.log(`✅ Reserva ${reservationId} confirmada por recepcionista ${confirmedBy}`);
    return savedReservation;
  }

  /**
   * Encontrar reservas pendientes
   */
  async findPendingReservations(startDate?: Date): Promise<Reservation[]> {
    const query: any = { status: 'pending' };
    
    if (startDate) {
      query.checkInDate = { $gte: startDate };
    }
    
    return await this.reservationModel
      .find(query)
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate('roomId', 'name roomNumber categoryId')
      .sort({ checkInDate: 1, createdAt: 1 })
      .exec();
  }

  /**
   * Verificar reservas del mismo día que expiraron (1 hora)
   */
  async expireSameDayReservations(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Encontrar reservas pendientes del mismo día
    const sameDayReservations = await this.reservationModel.find({
      status: 'pending',
      checkInDate: { $gte: today, $lt: tomorrow }
    });
    
    const now = new Date();
    let expiredCount = 0;
    
    for (const reservation of sameDayReservations) {
      const reservationTime = new Date((reservation as any).createdAt || reservation.checkInDate);
      const oneHourLater = new Date(reservationTime.getTime() + 60 * 60 * 1000);
      
      if (now > oneHourLater) {
        // Cancelar automáticamente
        reservation.status = 'cancelled';
        reservation.cancelledAt = now;
        reservation.cancellationReason = 'Expirada: No confirmada dentro de 1 hora';
        await reservation.save();
        
        expiredCount++;
        console.log(`⚠️ Reserva ${reservation._id} cancelada automáticamente por expiración`);
        
        // Invalidar cache de la habitación
        if (reservation.roomId) {
          const roomId = (reservation.roomId as any)._id?.toString() || reservation.roomId.toString();
          await this.redisService.invalidateRoomCache(roomId);
          await this.redisService.invalidateAvailableRoomsCache();
        }
      }
    }
    
    if (expiredCount > 0) {
      console.log(`⚠️ Total de reservas expiradas: ${expiredCount}`);
    }
  }
}
