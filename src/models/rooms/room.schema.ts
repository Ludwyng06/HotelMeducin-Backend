import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoomDocument = Room & Document;

@Schema({ timestamps: true })
export class Room {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
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
