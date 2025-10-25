import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ReservationsService } from '../services/reservations.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Body() createReservationDto: CreateReservationDto) {
    console.log('🎯 Controlador CREATE - DTO recibido:', createReservationDto);
    console.log('🎯 Controlador CREATE - userId tipo:', typeof createReservationDto.userId);
    console.log('🎯 Controlador CREATE - userId valor:', createReservationDto.userId);
    return this.reservationsService.create(createReservationDto);
  }

  @Get()
  findAll() {
    return this.reservationsService.findAll();
  }

  @Get('user')
  async findByUser(@Query('userId') userId: string) {
    console.log('🎯 Controlador - userId recibido:', userId);
    console.log('🎯 Controlador - tipo de userId:', typeof userId);
    
    const reservations = await this.reservationsService.findByUser(userId);
    console.log('🎯 Controlador - reservas devueltas por servicio:', reservations.length);
    
    return {
      success: true,
      data: reservations,
      message: 'Reservas obtenidas exitosamente'
    };
  }

  @Get('date-range')
  getByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reservationsService.getReservationsByDateRange(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('room/:roomId/occupied-dates')
  async getOccupiedDates(@Param('roomId') roomId: string) {
    console.log('🎯 Obteniendo fechas ocupadas para habitación:', roomId);
    const occupiedDates = await this.reservationsService.getOccupiedDatesByRoom(roomId);
    console.log('🎯 Fechas ocupadas encontradas:', occupiedDates.length);
    return {
      success: true,
      data: occupiedDates,
      message: 'Fechas ocupadas obtenidas exitosamente'
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReservationDto: any) {
    return this.reservationsService.update(id, updateReservationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(id);
  }
}
