import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoomCategoryDocument = RoomCategory & Document;

@Schema({ timestamps: true, collection: 'roomCategories' })
export class RoomCategory {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  icon: string;

  @Prop({ required: true })
  basePrice: number;

  @Prop({ required: true })
  maxCapacity: number;

  @Prop({ type: [String], required: true })
  bedTypes: string[];

  @Prop({ type: [String], required: true })
  standardAmenities: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RoomCategorySchema = SchemaFactory.createForClass(RoomCategory);

// Índices para consultas frecuentes
RoomCategorySchema.index({ code: 1 }, { unique: true }); // code ya es unique, pero asegurar índice
RoomCategorySchema.index({ name: 1 }, { unique: true }); // name ya es unique, pero asegurar índice
RoomCategorySchema.index({ isActive: 1 }); // Filtros de categorías activas
RoomCategorySchema.index({ basePrice: 1 }); // Ordenamiento por precio base