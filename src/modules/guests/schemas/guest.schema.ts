import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GuestDocument = Guest & Document;

@Schema({ timestamps: true })
export class Guest {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Reservation', required: true })
  reservationId: Types.ObjectId;

  @Prop({ default: false })
  isMainGuest: boolean;

  @Prop({ type: Types.ObjectId, ref: 'DocumentType', required: true })
  documentType: Types.ObjectId;

  @Prop({ required: true })
  documentNumber: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  birthDate: Date;

  @Prop({ required: true })
  nationality: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  email: string;

  @Prop({ default: false })
  isCompleted: boolean;
}

export const GuestSchema = SchemaFactory.createForClass(Guest);

// Índice compuesto para evitar duplicados de documentos
GuestSchema.index({ documentNumber: 1, documentType: 1 }, { unique: true });
