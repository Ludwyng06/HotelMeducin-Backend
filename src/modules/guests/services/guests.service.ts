import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guest, GuestDocument } from '../schemas/guest.schema';
import { CreateGuestDto, UpdateGuestDto } from '../dto/guest.dto';

@Injectable()
export class GuestsService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
  ) {}

  async create(createGuestDto: CreateGuestDto): Promise<Guest> {
    const createdGuest = new this.guestModel(createGuestDto);
    return createdGuest.save();
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
}
