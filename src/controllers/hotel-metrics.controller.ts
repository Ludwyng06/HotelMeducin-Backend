import { Controller, Get, Param } from '@nestjs/common';
import { RedisService } from '@config/redis.service';

@Controller('hotel-metrics')
export class HotelMetricsController {
  constructor(private readonly redisService: RedisService) {}

  @Get('dashboard')
  async getDashboard() {
    try {
      const metrics = await this.redisService.getHotelMetrics();
      
      return {
        success: true,
        message: 'Dashboard de métricas del hotel',
        data: {
          ...metrics,
          timestamp: new Date().toISOString(),
          status: 'active'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener métricas del hotel',
        error: error.message
      };
    }
  }

  @Get('daily/:date')
  async getDailyMetrics(@Param('date') date: string) {
    try {
      const reservations = await this.redisService.getDailyReservations(date);
      const revenue = await this.redisService.getDailyRevenue(date);
      
      return {
        success: true,
        message: `Métricas del ${date}`,
        data: {
          date,
          reservations,
          revenue,
          averageRevenue: reservations > 0 ? Math.round(revenue / reservations) : 0,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener métricas diarias',
        error: error.message
      };
    }
  }

  @Get('current')
  async getCurrentMetrics() {
    try {
      const occupiedRooms = await this.redisService.getOccupiedRoomsCount();
      const activeUsers = await this.redisService.getActiveUsersCount();
      
      return {
        success: true,
        message: 'Métricas actuales del hotel',
        data: {
          occupiedRooms,
          activeUsers,
          occupancyRate: occupiedRooms > 0 ? Math.round((occupiedRooms / 100) * 100) : 0, // Asumiendo 100 habitaciones totales
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener métricas actuales',
        error: error.message
      };
    }
  }

  @Get('trends')
  async getTrends() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      const todayReservations = await this.redisService.getDailyReservations(today);
      const yesterdayReservations = await this.redisService.getDailyReservations(yesterday);
      
      const todayRevenue = await this.redisService.getDailyRevenue(today);
      const yesterdayRevenue = await this.redisService.getDailyRevenue(yesterday);
      
      const reservationTrend = yesterdayReservations > 0 
        ? Math.round(((todayReservations - yesterdayReservations) / yesterdayReservations) * 100)
        : 0;
        
      const revenueTrend = yesterdayRevenue > 0 
        ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
        : 0;
      
      return {
        success: true,
        message: 'Tendencias del hotel',
        data: {
          reservations: {
            today: todayReservations,
            yesterday: yesterdayReservations,
            trend: reservationTrend,
            trendDirection: reservationTrend > 0 ? 'up' : reservationTrend < 0 ? 'down' : 'stable'
          },
          revenue: {
            today: todayRevenue,
            yesterday: yesterdayRevenue,
            trend: revenueTrend,
            trendDirection: revenueTrend > 0 ? 'up' : revenueTrend < 0 ? 'down' : 'stable'
          },
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener tendencias',
        error: error.message
      };
    }
  }
}
