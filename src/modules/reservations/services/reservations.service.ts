import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reservation, ReservationDocument } from '../schemas/reservation.schema';
import { CreateReservationDto } from '../dto/create-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectModel(Reservation.name) 
    private reservationModel: Model<ReservationDocument>
  ) {}

  async create(createReservationDto: CreateReservationDto): Promise<Reservation> {
    const createdReservation = new this.reservationModel({
      ...createReservationDto,
      userId: new Types.ObjectId(createReservationDto.userId),
      roomId: new Types.ObjectId(createReservationDto.roomId),
      checkInDate: new Date(createReservationDto.checkInDate),
      checkOutDate: new Date(createReservationDto.checkOutDate),
      serviceIds: createReservationDto.serviceIds?.map(id => new Types.ObjectId(id)) || []
    });
    
    return createdReservation.save();
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
    return occupiedDates;
  }
}
