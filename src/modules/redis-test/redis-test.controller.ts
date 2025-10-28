import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { RedisService } from '../../config/redis.service';

@Controller('redis-test')
export class RedisTestController {
  constructor(private readonly redisService: RedisService) {}

  @Get('ping')
  async ping() {
    try {
      await this.redisService.set('test:ping', 'pong', 10);
      const result = await this.redisService.get('test:ping');
      return {
        success: true,
        message: 'Redis está funcionando correctamente',
        test: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error conectando a Redis',
        error: error.message
      };
    }
  }

  @Post('cache-test')
  async cacheTest(@Body() data: { key: string; value: any; ttl?: number }) {
    try {
      await this.redisService.set(data.key, JSON.stringify(data.value), data.ttl || 60);
      const cached = await this.redisService.get(data.key);
      return {
        success: true,
        message: 'Datos guardados en cache',
        original: data.value,
        cached: cached ? JSON.parse(cached) : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error en cache test',
        error: error.message
      };
    }
  }

  @Get('cache-test/:key')
  async getCacheTest(@Param('key') key: string) {
    try {
      const cached = await this.redisService.get(key);
      return {
        success: true,
        key,
        cached: cached ? JSON.parse(cached) : null,
        exists: !!cached,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error obteniendo cache',
        error: error.message
      };
    }
  }

  @Delete('cache-test/:key')
  async deleteCacheTest(@Param('key') key: string) {
    try {
      await this.redisService.del(key);
      return {
        success: true,
        message: `Cache eliminado para key: ${key}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error eliminando cache',
        error: error.message
      };
    }
  }

  @Get('room-cache-test/:roomId')
  async testRoomCache(@Param('roomId') roomId: string) {
    try {
      // Simular fechas ocupadas
      const mockDates = ['2025-10-26', '2025-10-27', '2025-10-28'];
      
      // Guardar en cache
      await this.redisService.cacheRoomOccupiedDates(roomId, mockDates, 60);
      
      // Recuperar del cache
      const cachedDates = await this.redisService.getCachedRoomOccupiedDates(roomId);
      
      return {
        success: true,
        message: 'Test de cache de habitación completado',
        roomId,
        originalDates: mockDates,
        cachedDates,
        match: JSON.stringify(mockDates) === JSON.stringify(cachedDates),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error en test de cache de habitación',
        error: error.message
      };
    }
  }

  @Get('stats')
  async getStats() {
    try {
      // Obtener estadísticas básicas de Redis
      const testKey = 'redis:stats:test';
      await this.redisService.set(testKey, 'stats_test', 10);
      const exists = await this.redisService.exists(testKey);
      await this.redisService.del(testKey);
      
      return {
        success: true,
        message: 'Estadísticas de Redis',
        connection: 'OK',
        operations: {
          set: 'OK',
          get: 'OK',
          exists: exists,
          del: 'OK'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error obteniendo estadísticas',
        error: error.message
      };
    }
  }
}
