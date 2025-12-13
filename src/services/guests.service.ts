import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guest, GuestDocument } from '@models/guests/guest.schema';
import { CreateGuestDto, UpdateGuestDto } from '@models/guests/dto/guest.dto';

@Injectable()
export class GuestsService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
  ) {}

  async create(createGuestDto: CreateGuestDto): Promise<Guest> {
    // 🔍 VALIDAR DUPLICADOS antes de crear
    await this.validateDuplicates(createGuestDto);

    try {
      const createdGuest = new this.guestModel(createGuestDto);
      return await createdGuest.save();
    } catch (error: any) {
      // Manejar errores de MongoDB por violación de índices únicos
      if (error.code === 11000) {
        const duplicateField = Object.keys(error.keyPattern || {})[0];
        let message = 'Ya existe un registro con este valor';
        
        if (duplicateField === 'documentNumber') {
          message = `El documento ${createGuestDto.documentNumber} ya está registrado en el sistema`;
        } else if (duplicateField === 'phoneNumber') {
          message = `El teléfono ${createGuestDto.phoneNumber} ya está registrado en el sistema`;
        } else if (duplicateField === 'email') {
          message = `El email ${createGuestDto.email} ya está registrado en el sistema`;
        }
        
        throw new ConflictException(message);
      }
      throw error;
    }
  }

  /**
   * Validar duplicados antes de crear un huésped
   */
  private async validateDuplicates(createGuestDto: CreateGuestDto): Promise<void> {
    const checks: Promise<void>[] = [];

    // Validar documento duplicado
    if (createGuestDto.documentNumber && createGuestDto.documentType) {
      checks.push(
        this.guestModel
          .findOne({ 
            documentNumber: createGuestDto.documentNumber,
            documentType: createGuestDto.documentType 
          })
          .exec()
          .then(existing => {
            if (existing) {
              throw new ConflictException(
                `El documento ${createGuestDto.documentNumber} ya está registrado en el sistema`
              );
            }
          })
      );
    }

    // Validar teléfono duplicado
    if (createGuestDto.phoneNumber) {
      checks.push(
        this.guestModel
          .findOne({ phoneNumber: createGuestDto.phoneNumber })
          .exec()
          .then(existing => {
            if (existing) {
              throw new ConflictException(
                `El teléfono ${createGuestDto.phoneNumber} ya está registrado en el sistema`
              );
            }
          })
      );
    }

    // Validar email duplicado
    if (createGuestDto.email) {
      checks.push(
        this.guestModel
          .findOne({ email: createGuestDto.email })
          .exec()
          .then(existing => {
            if (existing) {
              throw new ConflictException(
                `El email ${createGuestDto.email} ya está registrado en el sistema`
              );
            }
          })
      );
    }

    await Promise.all(checks);
  }

  async findAll(): Promise<Guest[]> {
    return this.guestModel.find().populate('reservationId').populate('documentType').exec();
  }

  async findOne(id: string): Promise<Guest | null> {
    return this.guestModel.findById(id).populate('reservationId').populate('documentType').exec();
  }

  async findByReservation(reservationId: string): Promise<Guest[]> {
    return this.guestModel.find({ reservationId }).populate('documentType').exec();
  }

  async findByDocument(documentNumber: string, documentType: string): Promise<Guest | null> {
    return this.guestModel.findOne({ documentNumber, documentType }).exec();
  }

  async update(id: string, updateGuestDto: UpdateGuestDto): Promise<Guest | null> {
    return this.guestModel.findByIdAndUpdate(id, updateGuestDto, { new: true }).populate('documentType').exec();
  }

  async remove(id: string): Promise<Guest | null> {
    return this.guestModel.findByIdAndDelete(id).exec();
  }

  async removeByReservation(reservationId: string): Promise<void> {
    await this.guestModel.deleteMany({ reservationId }).exec();
  }

  async checkDocumentExists(documentNumber: string): Promise<boolean> {
    const guest = await this.guestModel.findOne({ documentNumber }).exec();
    return !!guest;
  }

  async checkPhoneExists(phoneNumber: string): Promise<boolean> {
    const guest = await this.guestModel.findOne({ phoneNumber }).exec();
    return !!guest;
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const guest = await this.guestModel.findOne({ email }).exec();
    return !!guest;
  }
}
