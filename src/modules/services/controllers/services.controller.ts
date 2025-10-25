import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ServicesService } from '../services/services.service';
import { CreateServiceDto } from '../dto/create-service.dto';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @Get()
  findAll(@Query('available') available?: string, @Query('category') category?: string) {
    if (available === 'true') {
      return this.servicesService.findAvailable();
    }
    if (category) {
      return this.servicesService.findByCategory(category);
    }
    return this.servicesService.findAll();
  }

  @Post('book')
  bookService(@Body() bookingData: { serviceId: string; userId: string }) {
    return this.servicesService.bookService(bookingData.serviceId, bookingData.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateServiceDto: any) {
    return this.servicesService.update(id, updateServiceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }
}
