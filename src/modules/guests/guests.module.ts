import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuestsService } from './services/guests.service';
import { GuestsController } from './controllers/guests.controller';
import { Guest, GuestSchema } from './schemas/guest.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Guest.name, schema: GuestSchema }
    ])
  ],
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [GuestsService],
})
export class GuestsModule {}
