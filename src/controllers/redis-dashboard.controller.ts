import { Controller, Get, Delete, Param } from '@nestjs/common';
import { RedisService } from '@config/redis.service';

@Controller('redis-dashboard')
export class RedisDashboardController {
  constructor(private readonly redisService: RedisService) {}

  @Get('all-keys')
  async getAllKeys() {
    try {
      // Nota: En producción usar SCAN en lugar de KEYS
      const keys = await this.redisService.client.keys('*');
      return {
        success: true,
        totalKeys: keys.length,
        keys: keys,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error obteniendo claves',
        error: error.message
      };
    }
  }

  @Get('room-cache')
  async getRoomCache() {
    try {
      const keys = await this.redisService.client.keys('occupied_dates:*');
      const roomCache: any[] = [];
      
      for (const key of keys) {
        const value = await this.redisService.get(key);
        const roomId = key.replace('occupied_dates:', '');
        roomCache.push({
          roomId,
          key,
          occupiedDates: value ? JSON.parse(value) : [],
          ttl: await this.redisService.client.ttl(key)
        });
      }
      
      return {
        success: true,
        message: 'Cache de habitaciones obtenido',
        totalRooms: roomCache.length,
        rooms: roomCache,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error obteniendo cache de habitaciones',
        error: error.message
      };
    }
  }

  @Get('available-rooms-cache')
  async getAvailableRoomsCache() {
    try {
      const cached = await this.redisService.getCachedAvailableRooms();
      return {
        success: true,
        message: 'Cache de habitaciones disponibles',
        hasCache: !!cached,
        rooms: cached || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error obteniendo cache de habitaciones disponibles',
        error: error.message
      };
    }
  }

  @Get('login-attempts')
  async getLoginAttempts() {
    try {
      const keys = await this.redisService.client.keys('login_attempts:*');
      const attempts: any[] = [];
      
      for (const key of keys) {
        const email = key.replace('login_attempts:', '');
        const count = await this.redisService.get(key);
        const ttl = await this.redisService.client.ttl(key);
        attempts.push({
          email,
          attempts: parseInt(count || '0'),
          ttl,
          canLogin: parseInt(count || '0') <= 5
        });
      }
      
      return {
        success: true,
        message: 'Intentos de login obtenidos',
        totalEmails: attempts.length,
        attempts,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error obteniendo intentos de login',
        error: error.message
      };
    }
  }

  @Get('sessions')
  async getSessions() {
    try {
      const keys = await this.redisService.client.keys('session:*');
      const sessions: any[] = [];
      
      for (const key of keys) {
        const token = key.replace('session:', '');
        const userId = await this.redisService.get(key);
        const ttl = await this.redisService.client.ttl(key);
        sessions.push({
          token: token.substring(0, 20) + '...', // Solo mostrar parte del token
          userId,
          ttl,
          isActive: !!userId
        });
      }
      
      return {
        success: true,
        message: 'Sesiones activas obtenidas',
        totalSessions: sessions.length,
        sessions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error obteniendo sesiones',
        error: error.message
      };
    }
  }

  @Get('stats')
  async getStats() {
    try {
      const info = await this.redisService.client.info('memory');
      const stats = await this.redisService.client.info('stats');
      
      // Parsear información de memoria
      const memoryLines = info.split('\r\n').filter(line => line.includes(':'));
      const memoryInfo: any = {};
      memoryLines.forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) memoryInfo[key.trim()] = value.trim();
      });
      
      // Parsear estadísticas
      const statsLines = stats.split('\r\n').filter(line => line.includes(':'));
      const statsInfo: any = {};
      statsLines.forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) statsInfo[key.trim()] = value.trim();
      });
      
      return {
        success: true,
        message: 'Estadísticas de Redis',
        memory: {
          used_memory_human: memoryInfo.used_memory_human,
          used_memory_peak_human: memoryInfo.used_memory_peak_human,
          used_memory_rss_human: memoryInfo.used_memory_rss_human
        },
        stats: {
          total_connections_received: statsInfo.total_connections_received,
          total_commands_processed: statsInfo.total_commands_processed,
          keyspace_hits: statsInfo.keyspace_hits,
          keyspace_misses: statsInfo.keyspace_misses
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

  @Get('overview')
  async getOverview() {
    try {
      const allKeys = await this.redisService.client.keys('*');
      const roomKeys = allKeys.filter(key => key.startsWith('occupied_dates:'));
      const sessionKeys = allKeys.filter(key => key.startsWith('session:'));
      const loginKeys = allKeys.filter(key => key.startsWith('login_attempts:'));
      const availableRoomsKey = allKeys.filter(key => key === 'available_rooms');
      
      return {
        success: true,
        message: 'Resumen completo de Redis',
        overview: {
          totalKeys: allKeys.length,
          roomCache: {
            count: roomKeys.length,
            keys: roomKeys
          },
          sessions: {
            count: sessionKeys.length,
            keys: sessionKeys.map(key => key.replace('session:', '').substring(0, 20) + '...')
          },
          loginAttempts: {
            count: loginKeys.length,
            keys: loginKeys.map(key => key.replace('login_attempts:', ''))
          },
          availableRooms: {
            cached: availableRoomsKey.length > 0,
            key: availableRoomsKey[0] || null
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error obteniendo resumen',
        error: error.message
      };
    }
  }

  @Delete('clear-cache')
  async clearCache() {
    try {
      const keys = await this.redisService.client.keys('*');
      let deletedCount = 0;
      
      for (const key of keys) {
        await this.redisService.del(key);
        deletedCount++;
      }
      
      return {
        success: true,
        message: 'Cache limpiado exitosamente',
        deletedKeys: deletedCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error limpiando cache',
        error: error.message
      };
    }
  }

  @Delete('clear-room-cache/:roomId')
  async clearRoomCache(@Param('roomId') roomId: string) {
    try {
      const key = `occupied_dates:${roomId}`;
      const exists = await this.redisService.exists(key);
      
      if (exists) {
        await this.redisService.del(key);
        return {
          success: true,
          message: `Cache de habitación ${roomId} eliminado`,
          roomId,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          message: `No hay cache para la habitación ${roomId}`,
          roomId,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error eliminando cache de habitación',
        error: error.message
      };
    }
  }
}
