import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { GuestsService } from '@services/guests.service';
import { CreateGuestDto, UpdateGuestDto } from '@models/guests/dto/guest.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Get('public/check-document')
  async checkDocumentExistsPublic(
    @Query('documentNumber') documentNumber: string,
    @Query('documentType') documentType?: string,
  ) {
    // Si envían documentType, validar la combinación; si no, por número global
    let exists = false;
    if (documentType) {
      const found = await this.guestsService.findByDocument(documentNumber, documentType);
      exists = !!found;
    } else {
      exists = await this.guestsService.checkDocumentExists(documentNumber);
    }
    return { exists };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createGuestDto: CreateGuestDto) {
    return this.guestsService.create(createGuestDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.guestsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.guestsService.findOne(id);
  }

  @Get('reservation/:reservationId')
  @UseGuards(JwtAuthGuard)
  findByReservation(@Param('reservationId') reservationId: string) {
    return this.guestsService.findByReservation(reservationId);
  }

  @Get('document/:documentNumber/:documentType')
  @UseGuards(JwtAuthGuard)
  findByDocument(@Param('documentNumber') documentNumber: string, @Param('documentType') documentType: string) {
    return this.guestsService.findByDocument(documentNumber, documentType);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateGuestDto: UpdateGuestDto) {
    return this.guestsService.update(id, updateGuestDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.guestsService.remove(id);
  }
}
