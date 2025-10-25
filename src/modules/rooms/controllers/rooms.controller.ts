import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { RoomsService } from '../services/rooms.service';
import { CreateRoomDto } from '../dto/create-room.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createRoomDto: CreateRoomDto) {
    const room = await this.roomsService.create(createRoomDto);
    return {
      success: true,
      data: room,
      message: 'Habitación creada exitosamente'
    };
  }

  @Get()
  async findAll(@Query('available') available?: string) {
    let rooms;
    if (available === 'true') {
      rooms = await this.roomsService.findAvailable();
    } else {
      rooms = await this.roomsService.findAll();
    }
    
    return {
      success: true,
      data: rooms,
      message: 'Habitaciones obtenidas exitosamente'
    };
  }

  @Get('search')
  async searchRooms(@Query() filters: any) {
    const rooms = await this.roomsService.searchRooms(filters);
    return {
      success: true,
      data: rooms,
      message: 'Búsqueda de habitaciones completada'
    };
  }

  @Get('category/:categoryId')
  async findByCategory(@Param('categoryId') categoryId: string) {
    const rooms = await this.roomsService.findByCategory(categoryId);
    return {
      success: true,
      data: rooms,
      message: 'Habitaciones por categoría obtenidas exitosamente'
    };
  }

  @Get('floor/:floor')
  async findByFloor(@Param('floor') floor: string) {
    const rooms = await this.roomsService.findByFloor(parseInt(floor));
    return {
      success: true,
      data: rooms,
      message: 'Habitaciones por piso obtenidas exitosamente'
    };
  }

  @Get('availability')
  async checkAvailability(
    @Query('roomId') roomId: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    const isAvailable = await this.roomsService.checkAvailability(
      roomId,
      new Date(checkIn),
      new Date(checkOut),
    );
    return {
      success: true,
      data: { isAvailable },
      message: 'Disponibilidad verificada'
    };
  }

  @Get('available-by-dates')
  async getAvailableByDates(
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    const rooms = await this.roomsService.getAvailableRoomsByDateRange(
      new Date(checkIn),
      new Date(checkOut),
    );
    return {
      success: true,
      data: rooms,
      message: 'Habitaciones disponibles obtenidas'
    };
  }

  @Get('number/:roomNumber')
  async findByRoomNumber(@Param('roomNumber') roomNumber: string) {
    const room = await this.roomsService.findByRoomNumber(roomNumber);
    if (!room) {
      return {
        success: false,
        message: 'Habitación no encontrada'
      };
    }
    return {
      success: true,
      data: room,
      message: 'Habitación obtenida exitosamente'
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const room = await this.roomsService.findOne(id);
    if (!room) {
      return {
        success: false,
        message: 'Habitación no encontrada'
      };
    }
    return {
      success: true,
      data: room,
      message: 'Habitación obtenida exitosamente'
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateRoomDto: any) {
    const room = await this.roomsService.update(id, updateRoomDto);
    if (!room) {
      return {
        success: false,
        message: 'Habitación no encontrada'
      };
    }
    return {
      success: true,
      data: room,
      message: 'Habitación actualizada exitosamente'
    };
  }

  @Patch(':id/availability')
  @UseGuards(JwtAuthGuard)
  async updateAvailability(
    @Param('id') id: string, 
    @Body('isAvailable') isAvailable: boolean
  ) {
    const room = await this.roomsService.updateAvailability(id, isAvailable);
    return {
      success: true,
      data: room,
      message: `Habitación ${isAvailable ? 'disponible' : 'no disponible'}`
    };
  }

  @Patch(':id/maintenance')
  @UseGuards(JwtAuthGuard)
  async setMaintenance(
    @Param('id') id: string, 
    @Body('isMaintenance') isMaintenance: boolean
  ) {
    const room = await this.roomsService.setMaintenance(id, isMaintenance);
    return {
      success: true,
      data: room,
      message: `Habitación ${isMaintenance ? 'en mantenimiento' : 'fuera de mantenimiento'}`
    };
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard)
  async getStats() {
    const stats = await this.roomsService.getStats();
    return {
      success: true,
      data: stats,
      message: 'Estadísticas obtenidas exitosamente'
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    const room = await this.roomsService.remove(id);
    if (!room) {
      return {
        success: false,
        message: 'Habitación no encontrada'
      };
    }
    return {
      success: true,
      data: room,
      message: 'Habitación eliminada exitosamente'
    };
  }
}
