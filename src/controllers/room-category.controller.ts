import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RoomCategoryService } from '../services/room-category.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@Controller('room-categories')
export class RoomCategoryController {
  constructor(private readonly roomCategoryService: RoomCategoryService) {}

  // Obtener todas las categorías activas
  @Get()
  async findAll() {
    const categories = await this.roomCategoryService.findAll();
    return {
      success: true,
      data: categories,
      message: 'Categorías obtenidas exitosamente'
    };
  }

  // Obtener categoría por ID
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const category = await this.roomCategoryService.findOne(id);
    if (!category) {
      return {
        success: false,
        message: 'Categoría no encontrada'
      };
    }
    return {
      success: true,
      data: category,
      message: 'Categoría obtenida exitosamente'
    };
  }

  // Obtener categorías por rango de precio
  @Get('search/price-range')
  async findByPriceRange(
    @Query('minPrice') minPrice: string,
    @Query('maxPrice') maxPrice: string
  ) {
    const categories = await this.roomCategoryService.findByPriceRange(
      parseInt(minPrice),
      parseInt(maxPrice)
    );
    return {
      success: true,
      data: categories,
      message: 'Categorías filtradas por precio exitosamente'
    };
  }

  // Obtener categorías por capacidad
  @Get('search/capacity')
  async findByCapacity(@Query('capacity') capacity: string) {
    const categories = await this.roomCategoryService.findByCapacity(
      parseInt(capacity)
    );
    return {
      success: true,
      data: categories,
      message: 'Categorías filtradas por capacidad exitosamente'
    };
  }

  // Obtener estadísticas de categorías (solo admin)
  @UseGuards(JwtAuthGuard)
  @Get('admin/stats')
  async getStats() {
    const stats = await this.roomCategoryService.getStats();
    return {
      success: true,
      data: stats,
      message: 'Estadísticas obtenidas exitosamente'
    };
  }
}
