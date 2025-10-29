import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReservationDraftDocument = ReservationDraft & Document;

@Schema({ timestamps: true })
export class ReservationDraft {
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

  @Prop({ type: [{
    documentType: { type: Types.ObjectId, ref: 'DocumentType' },
    documentNumber: String,
    firstName: String,
    lastName: String,
    birthDate: Date,
    nationality: String,
    phoneNumber: String,
    email: String,
    isCompleted: { type: Boolean, default: false }
  }], default: [] })
  guests: Array<{
    documentType: Types.ObjectId;
    documentNumber: string;
    firstName: string;
    lastName: string;
    birthDate: Date;
    nationality: string;
    phoneNumber: string;
    email: string;
    isCompleted: boolean;
  }>;

  @Prop({ required: true })
  totalPrice: number;

  @Prop()
  specialRequests?: string;

  @Prop({ required: true })
  expiresAt: Date; // Borrar después de 24 horas
}

export const ReservationDraftSchema = SchemaFactory.createForClass(ReservationDraft);

// Índice TTL para auto-eliminar borradores expirados
ReservationDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
