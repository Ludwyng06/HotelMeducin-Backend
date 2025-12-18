import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReservationDraft, ReservationDraftDocument } from '@models/reservation-drafts/reservation-draft.schema';
import { CreateReservationDraftDto, UpdateReservationDraftDto } from '@models/reservation-drafts/dto/reservation-draft.dto';
import { TemporalUtils } from '@common/utils/temporal.utils';
import { Temporal } from '@js-temporal/polyfill';

@Injectable()
export class ReservationDraftsService {
  constructor(
    @InjectModel(ReservationDraft.name) private reservationDraftModel: Model<ReservationDraftDocument>,
  ) {}

  async create(createReservationDraftDto: CreateReservationDraftDto): Promise<ReservationDraft> {
    // Establecer fecha de expiración a 24 horas usando Temporal
    const now = TemporalUtils.now();
    const expiresAt = now.add({ hours: 24 });
    // Convertir a Date para MongoDB (expiresAt necesita ser Date para el índice TTL)
    const expiresAtDate = TemporalUtils.zonedDateTimeToDate(expiresAt);

    const createdDraft = new this.reservationDraftModel({
      ...createReservationDraftDto,
      expiresAt: expiresAtDate
    });
    return createdDraft.save();
  }

  async findAll(): Promise<ReservationDraft[]> {
    return this.reservationDraftModel.find().populate('userId').populate('roomId').exec();
  }

  async findOne(id: string): Promise<ReservationDraft | null> {
    return this.reservationDraftModel.findById(id).populate('userId').populate('roomId').exec();
  }

  async findByUser(userId: string): Promise<ReservationDraft | null> {
    return this.reservationDraftModel.findOne({ userId }).populate('roomId').exec();
  }

  async update(id: string, updateReservationDraftDto: UpdateReservationDraftDto): Promise<ReservationDraft | null> {
    return this.reservationDraftModel.findByIdAndUpdate(id, updateReservationDraftDto, { new: true }).populate('roomId').exec();
  }

  async remove(id: string): Promise<ReservationDraft | null> {
    return this.reservationDraftModel.findByIdAndDelete(id).exec();
  }

  async removeByUser(userId: string): Promise<void> {
    await this.reservationDraftModel.deleteMany({ userId }).exec();
  }

  async confirmReservation(id: string): Promise<ReservationDraft | null> {
    const draft = await this.reservationDraftModel.findById(id).exec();
    if (!draft) {
      return null;
    }

    // Aquí se convertiría el borrador en una reserva real
    // Por ahora solo retornamos el borrador
    return draft;
  }
}
