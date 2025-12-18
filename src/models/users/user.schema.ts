import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: function() {
    // Password requerido solo si authProvider es 'local'
    return this.authProvider === 'local' || !this.authProvider;
  }})
  password?: string;

  @Prop({ type: Types.ObjectId, ref: 'UserRole', required: true })
  roleId: Types.ObjectId;

  @Prop()
  phoneNumber?: string;

  @Prop({ type: Types.ObjectId, ref: 'DocumentType' })
  documentType?: Types.ObjectId;

  @Prop()
  documentNumber?: string;

  @Prop()
  nationality?: string;

  @Prop()
  birthDate?: Date;

  @Prop({ default: true })
  isActive: boolean;

  // 🔐 Campos para autenticación 2FA
  @Prop()
  twoFactorSecret?: string;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  // 🔐 Campos para OAuth 2.0 (Google)
  @Prop()
  googleId?: string;

  @Prop({ default: 'local' })
  authProvider: string; // 'local' | 'google'
}

export const UserSchema = SchemaFactory.createForClass(User);

// Índices únicos
UserSchema.index({ email: 1 }, { unique: true }); // email ya es unique, pero asegurar índice
UserSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true }); // sparse: permite null/undefined
UserSchema.index({ googleId: 1 }, { unique: true, sparse: true }); // Para búsquedas OAuth

// Índices para consultas frecuentes
UserSchema.index({ roleId: 1, isActive: 1 }); // Búsquedas por rol y estado
UserSchema.index({ isActive: 1 }); // Filtros de usuarios activos
UserSchema.index({ authProvider: 1 }); // Filtros por proveedor de autenticación
UserSchema.index({ twoFactorEnabled: 1 }); // Búsquedas de usuarios con 2FA