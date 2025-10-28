import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DocumentTypeDocument = DocumentType & Document;

@Schema({ timestamps: true })
export class DocumentType {
  _id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  validationPattern: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  description?: string;
}

export const DocumentTypeSchema = SchemaFactory.createForClass(DocumentType);
