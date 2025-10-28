import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ReservationDraftsService } from '../services/reservation-drafts.service';
import { CreateReservationDraftDto, UpdateReservationDraftDto } from '../dto/reservation-draft.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('reservation-drafts')
@UseGuards(JwtAuthGuard)
export class ReservationDraftsController {
  constructor(private readonly reservationDraftsService: ReservationDraftsService) {}

  @Post()
  create(@Body() createReservationDraftDto: CreateReservationDraftDto) {
    return this.reservationDraftsService.create(createReservationDraftDto);
  }

  @Get()
  findAll() {
    return this.reservationDraftsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservationDraftsService.findOne(id);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.reservationDraftsService.findByUser(userId);
  }

  // Eliminar borrador por userId (conveniencia para frontend)
  @Delete('user/:userId')
  removeByUser(@Param('userId') userId: string) {
    return this.reservationDraftsService.removeByUser(userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReservationDraftDto: UpdateReservationDraftDto) {
    return this.reservationDraftsService.update(id, updateReservationDraftDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reservationDraftsService.remove(id);
  }

  @Post(':id/confirm')
  confirmReservation(@Param('id') id: string) {
    return this.reservationDraftsService.confirmReservation(id);
  }
}
