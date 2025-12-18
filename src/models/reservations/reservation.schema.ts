import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReservationDocument = Reservation & Document;

@Schema({ timestamps: true })
export class Reservation {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  roomId: Types.ObjectId;

  @Prop({ required: true })
  checkInDate: Date;

  @Prop({ required: true })
  checkOutDate: Date;

  @Prop({ required: true })
  guestCount: number;

  @Prop({ required: true })
  maxCapacity: number;

  @Prop({ required: true, min: 0 })
  totalPrice: number;

  @Prop({ default: 'pending', enum: ['pending', 'confirmed', 'cancelled', 'completed'] })
  status: string;

  @Prop()
  specialRequests?: string;

  @Prop({ type: [Types.ObjectId], ref: 'Service', default: [] })
  serviceIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  confirmedBy?: Types.ObjectId; // ID del recepcionista que confirmó

  @Prop()
  confirmedAt?: Date;

  @Prop()
  paymentMethod?: string; // 'efectivo', 'tarjeta', 'transferencia', etc.

  @Prop()
  paymentNotes?: string;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;

  // Campos automáticos de timestamps (agregados por Mongoose con timestamps: true)
  createdAt?: Date;
  updatedAt?: Date;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);

// Índices para consultas frecuentes
ReservationSchema.index({ userId: 1, createdAt: -1 }); // Reservas por usuario ordenadas por fecha
ReservationSchema.index({ roomId: 1 }); // Reservas por habitación
ReservationSchema.index({ status: 1, createdAt: -1 }); // Reservas por estado ordenadas por fecha

// Índice compuesto para búsquedas de disponibilidad (rango de fechas)
ReservationSchema.index({ 
  roomId: 1, 
  checkInDate: 1, 
  checkOutDate: 1, 
  status: 1 
}); // Optimiza consultas de disponibilidad de habitaciones

// Índice para búsquedas por rango de fechas
ReservationSchema.index({ checkInDate: 1, checkOutDate: 1 }); // Búsquedas por período

// Índice para reportes y estadísticas
ReservationSchema.index({ status: 1, checkInDate: 1 }); // Reportes por estado y fecha