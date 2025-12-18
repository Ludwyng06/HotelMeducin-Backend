import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ServiceDocument = Service & Document;

@Schema({ timestamps: true })
export class Service {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true })
  category: string; // 'spa', 'restaurant', 'gym', 'pool'

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop()
  imageUrl?: string;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

// Índices para consultas frecuentes
ServiceSchema.index({ category: 1, isAvailable: 1 }); // Servicios por categoría y disponibilidad
ServiceSchema.index({ isAvailable: 1 }); // Filtros de disponibilidad
ServiceSchema.index({ price: 1 }); // Ordenamiento por precio
ServiceSchema.index({ name: 1 }); // Búsquedas por nombre