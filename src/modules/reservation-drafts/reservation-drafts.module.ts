import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationDraftsService } from './services/reservation-drafts.service';
import { ReservationDraftsController } from './controllers/reservation-drafts.controller';
import { ReservationDraft, ReservationDraftSchema } from './schemas/reservation-draft.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReservationDraft.name, schema: ReservationDraftSchema }
    ])
  ],
  controllers: [ReservationDraftsController],
  providers: [ReservationDraftsService],
  exports: [ReservationDraftsService],
})
export class ReservationDraftsModule {}
