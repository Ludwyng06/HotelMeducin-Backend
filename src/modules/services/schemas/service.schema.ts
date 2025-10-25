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
