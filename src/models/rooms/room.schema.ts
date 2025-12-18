import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoomDocument = Room & Document;

@Schema({ timestamps: true })
export class Room {
  _id: Types.ObjectId;

  @Prop({ required: true })
  roomNumber: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'RoomCategory' })
  categoryId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 1 })
  capacity: number;

  @Prop({ required: true })
  bedType: string;

  @Prop({ required: true, min: 1, max: 20 })
  floor: number;

  @Prop()
  view: string;

  @Prop({ type: [String], default: [] })
  imageUrls: string[];

  @Prop({ type: [String], default: [] })
  amenities: string[];

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ default: false })
  isMaintenance: boolean;
}

export const RoomSchema = SchemaFactory.createForClass(Room);

// Índices para consultas frecuentes
RoomSchema.index({ roomNumber: 1 }, { unique: true }); // roomNumber ya es unique, pero asegurar índice
RoomSchema.index({ categoryId: 1, isAvailable: 1 }); // Habitaciones por categoría y disponibilidad
RoomSchema.index({ floor: 1 }); // Búsquedas por piso
RoomSchema.index({ isAvailable: 1, isMaintenance: 1 }); // Filtros de disponibilidad y mantenimiento
RoomSchema.index({ capacity: 1 }); // Búsquedas por capacidad
RoomSchema.index({ price: 1 }); // Ordenamiento por precio

// Índice compuesto para búsquedas avanzadas
RoomSchema.index({ 
  categoryId: 1, 
  isAvailable: 1, 
  capacity: 1, 
  floor: 1 
}); // Búsquedas complejas de habitaciones disponibles