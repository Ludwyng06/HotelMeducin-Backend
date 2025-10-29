import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReservationDraftsService } from '@services/reservation-drafts.service';
import { CreateReservationDraftDto, UpdateReservationDraftDto } from '@models/reservation-drafts/dto/reservation-draft.dto';

@Controller('reservation-drafts')
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

	@Patch(':id')
	update(@Param('id') id: string, @Body() updateReservationDraftDto: UpdateReservationDraftDto) {
		return this.reservationDraftsService.update(id, updateReservationDraftDto);
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.reservationDraftsService.remove(id);
	}

	@Delete('user/:userId')
	removeByUser(@Param('userId') userId: string) {
		return this.reservationDraftsService.removeByUser(userId);
	}
}
