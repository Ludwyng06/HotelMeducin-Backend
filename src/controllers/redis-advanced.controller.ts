import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { RedisService } from '@config/redis.service';

@Controller('redis-advanced')
export class RedisAdvancedController {
  constructor(private readonly redisService: RedisService) {}

  // 🏨 HASH CACHE para habitaciones
  @Post('room-hash/:roomId')
  async cacheRoomHash(@Param('roomId') roomId: string, @Body() roomData: any) {
    try {
      await this.redisService.cacheRoomHash(roomId, roomData, 600);
      return {
        success: true,
        message: `Room hash cached for ${roomId}`,
        roomId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error caching room hash',
        error: error.message
      };
    }
  }

  @Get('room-hash/:roomId')
  async getRoomHash(@Param('roomId') roomId: string) {
    try {
      const roomData = await this.redisService.getCachedRoomHash(roomId);
      return {
        success: true,
        message: `Room hash retrieved for ${roomId}`,
        roomId,
        data: roomData,
        cached: !!roomData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error retrieving room hash',
        error: error.message
      };
    }
  }

  @Get('room-hash/:roomId/:field')
  async getRoomHashField(
    @Param('roomId') roomId: string, 
    @Param('field') field: string
  ) {
    try {
      const value = await this.redisService.getRoomHashField(roomId, field);
      return {
        success: true,
        message: `Room hash field retrieved`,
        roomId,
        field,
        value,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error retrieving room hash field',
        error: error.message
      };
    }
  }

  // 📊 MÉTRICAS Y CONTADORES
  @Get('metrics')
  async getHotelMetrics() {
    try {
      const metrics = await this.redisService.getHotelMetrics();
      return {
        success: true,
        message: 'Hotel metrics retrieved',
        metrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error retrieving metrics',
        error: error.message
      };
    }
  }

  @Post('metrics/reservations/:date')
  async incrementDailyReservations(@Param('date') date: string) {
    try {
      const count = await this.redisService.incrementDailyReservations(date);
      return {
        success: true,
        message: `Daily reservations incremented for ${date}`,
        date,
        count,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error incrementing daily reservations',
        error: error.message
      };
    }
  }

  @Post('metrics/revenue/:date/:amount')
  async addDailyRevenue(
    @Param('date') date: string, 
    @Param('amount') amount: string
  ) {
    try {
      const total = await this.redisService.addDailyRevenue(date, parseInt(amount));
      return {
        success: true,
        message: `Daily revenue added for ${date}`,
        date,
        amount: parseInt(amount),
        total,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error adding daily revenue',
        error: error.message
      };
    }
  }

  @Post('metrics/rooms/occupied')
  async incrementOccupiedRooms() {
    try {
      const count = await this.redisService.incrementOccupiedRooms();
      return {
        success: true,
        message: 'Occupied rooms incremented',
        count,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error incrementing occupied rooms',
        error: error.message
      };
    }
  }

  @Post('metrics/users/active')
  async incrementActiveUsers() {
    try {
      const count = await this.redisService.incrementActiveUsers();
      return {
        success: true,
        message: 'Active users incremented',
        count,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error incrementing active users',
        error: error.message
      };
    }
  }

  @Get('metrics/daily/:date')
  async getDailyMetrics(@Param('date') date: string) {
    try {
      const reservations = await this.redisService.getDailyReservations(date);
      const revenue = await this.redisService.getDailyRevenue(date);
      
      return {
        success: true,
        message: `Daily metrics for ${date}`,
        date,
        reservations,
        revenue,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error retrieving daily metrics',
        error: error.message
      };
    }
  }

  @Get('metrics/current')
  async getCurrentMetrics() {
    try {
      const occupiedRooms = await this.redisService.getOccupiedRoomsCount();
      const activeUsers = await this.redisService.getActiveUsersCount();
      
      return {
        success: true,
        message: 'Current metrics retrieved',
        occupiedRooms,
        activeUsers,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error retrieving current metrics',
        error: error.message
      };
    }
  }

  @Delete('metrics/clear')
  async clearMetrics() {
    try {
      await this.redisService.clearMetrics();
      return {
        success: true,
        message: 'All metrics cleared',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error clearing metrics',
        error: error.message
      };
    }
  }

  // 🧪 FUNCIONES DE TESTING
  @Post('test/hash-performance')
  async testHashPerformance() {
    try {
      const startTime = Date.now();
      
      // Test con datos de habitación
      const roomData = {
        _id: 'test_room_123',
        name: 'Suite Test',
        roomNumber: '999',
        price: 300,
        capacity: 4,
        bedType: 'King Size',
        floor: 5,
        view: 'Ocean',
        isAvailable: true,
        isMaintenance: false,
        categoryId: { _id: 'cat_123', name: 'Suite' },
        amenities: ['WiFi', 'TV', 'Minibar'],
        imageUrls: ['/images/suite.jpg'],
        occupiedDates: ['2025-10-26', '2025-10-27']
      };
      
      // Cache con hash
      await this.redisService.cacheRoomHash('test_room_123', roomData, 60);
      const retrieved = await this.redisService.getCachedRoomHash('test_room_123');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      return {
        success: true,
        message: 'Hash performance test completed',
        duration: `${duration}ms`,
        dataSize: JSON.stringify(roomData).length,
        retrieved: !!retrieved,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error in hash performance test',
        error: error.message
      };
    }
  }
}
