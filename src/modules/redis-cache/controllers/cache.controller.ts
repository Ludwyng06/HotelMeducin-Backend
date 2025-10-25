import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { CacheService } from '../services/cache.service';

@Controller('cache')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  // 🔄 ENDPOINTS PARA DEMOSTRAR PROCESOS ASINCRÓNICOS AVANZADOS

  @Get('stats')
  async getCacheStats() {
    return this.cacheService.getCacheStats();
  }

  @Post('clear')
  async clearCache() {
    await this.cacheService.clearCacheAsync();
    return {
      success: true,
      message: 'Cache limpiado exitosamente',
      timestamp: new Date()
    };
  }

  @Post('get-multiple')
  async getMultipleKeys(@Body('keys') keys: string[]) {
    const results = await this.cacheService.getMultipleAsync(keys);
    return {
      success: true,
      results,
      timestamp: new Date()
    };
  }

  @Post('set-multiple')
  async setMultipleKeys(@Body() data: { keys: Record<string, any>, ttl?: number }) {
    await this.cacheService.setMultipleAsync(data.keys, data.ttl);
    return {
      success: true,
      message: `${Object.keys(data.keys).length} claves guardadas en cache`,
      timestamp: new Date()
    };
  }

  @Post('invalidate-pattern')
  async invalidateByPattern(@Body('pattern') pattern: string) {
    await this.cacheService.invalidateByPattern(pattern);
    return {
      success: true,
      message: `Cache invalidado por patrón: ${pattern}`,
      timestamp: new Date()
    };
  }

  // 🚀 DEMOSTRACIÓN DE CONCURRENCIA
  @Post('demo-concurrency')
  async demonstrateConcurrency() {
    console.log('🚀 Iniciando demostración de concurrencia...');
    const startTime = Date.now();

    try {
      // Simular múltiples operaciones concurrentes
      const operations = [
        this.cacheService.setAsync('demo-key-1', { data: 'Operación 1' }),
        this.cacheService.setAsync('demo-key-2', { data: 'Operación 2' }),
        this.cacheService.setAsync('demo-key-3', { data: 'Operación 3' }),
        this.cacheService.getAsync('demo-key-1'),
        this.cacheService.getAsync('demo-key-2'),
        this.cacheService.getAsync('demo-key-3'),
      ];

      // Ejecutar todas las operaciones en paralelo
      const results = await Promise.all(operations);
      const endTime = Date.now();

      return {
        success: true,
        message: 'Demostración de concurrencia completada',
        executionTime: endTime - startTime,
        operations: results.length,
        results,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Error en demostración de concurrencia:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}
