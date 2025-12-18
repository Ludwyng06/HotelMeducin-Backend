import { Controller, Get, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { RoomCategoryService } from '../services/room-category.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';

@Controller('room-categories')
export class RoomCategoryController {
  private readonly logger = new Logger(RoomCategoryController.name);
  
  constructor(private readonly roomCategoryService: RoomCategoryService) {}

  // Obtener todas las categorías activas
  @Public()
  @Get()
  async findAll() {
    this.logger.log('📥 Petición recibida: GET /room-categories');
    try {
      const categories = await this.roomCategoryService.findAll();
      this.logger.log(`✅ Categorías encontradas: ${Array.isArray(categories) ? categories.length : 'N/A'}`);
      return {
        success: true,
        data: categories,
        message: 'Categorías obtenidas exitosamente'
      };
    } catch (error) {
      this.logger.error('❌ Error al obtener categorías:', error);
      throw error;
    }
  }

  // Obtener categoría por ID
  @Public()
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
  @Public()
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
  @Public()
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
