import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DocumentTypeDocument = DocumentType & Document;

@Schema({ timestamps: true })
export class DocumentType {
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  validationPattern: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  description?: string;
}

export const DocumentTypeSchema = SchemaFactory.createForClass(DocumentType);

// Índices para consultas frecuentes
DocumentTypeSchema.index({ code: 1 }, { unique: true }); // code ya es unique, pero asegurar índice
DocumentTypeSchema.index({ name: 1 }, { unique: true }); // name ya es unique, pero asegurar índice
DocumentTypeSchema.index({ isActive: 1 }); // Filtros de tipos de documento activos