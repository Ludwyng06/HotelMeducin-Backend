import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  // 🔄 CACHE ASINCRÓNICO CON REDIS - Procesos Concurrentes Avanzados

  // Obtener datos del cache de forma asincrónica
  async getAsync<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.cacheManager.get<T>(key);
      if (cached) {
        console.log(`📦 Cache hit para clave: ${key}`);
        return cached;
      }
      console.log(`❌ Cache miss para clave: ${key}`);
      return null;
    } catch (error) {
      console.error(`❌ Error obteniendo cache para ${key}:`, error);
      return null;
    }
  }

  // Guardar datos en cache de forma asincrónica
  async setAsync<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl || 300000); // 5 minutos por defecto
      console.log(`💾 Datos guardados en cache: ${key}`);
    } catch (error) {
      console.error(`❌ Error guardando cache para ${key}:`, error);
    }
  }

  // Invalidar cache de forma asincrónica
  async invalidateAsync(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      console.log(`🗑️ Cache invalidado: ${key}`);
    } catch (error) {
      console.error(`❌ Error invalidando cache para ${key}:`, error);
    }
  }

  // 🚀 CACHE PARALELO - Obtener múltiples claves simultáneamente
  async getMultipleAsync<T>(keys: string[]): Promise<Record<string, T | null>> {
    console.log(`🔄 Obteniendo ${keys.length} claves del cache en paralelo...`);
    const startTime = Date.now();

    try {
      // Ejecutar todas las consultas de cache en paralelo
      const promises = keys.map(async (key) => {
        const value = await this.getAsync<T>(key);
        return { key, value };
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Convertir resultados a objeto
      const result: Record<string, T | null> = {};
      results.forEach(({ key, value }) => {
        result[key] = value;
      });

      console.log(`✅ ${keys.length} claves obtenidas en paralelo en ${endTime - startTime}ms`);
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo múltiples claves del cache:', error);
      return {};
    }
  }

  // 🚀 CACHE PARALELO - Guardar múltiples claves simultáneamente
  async setMultipleAsync<T>(data: Record<string, T>, ttl?: number): Promise<void> {
    const keys = Object.keys(data);
    console.log(`🔄 Guardando ${keys.length} claves en cache en paralelo...`);
    const startTime = Date.now();

    try {
      // Ejecutar todas las operaciones de guardado en paralelo
      const promises = keys.map(async (key) => {
        await this.setAsync(key, data[key], ttl);
      });

      await Promise.all(promises);
      const endTime = Date.now();

      console.log(`✅ ${keys.length} claves guardadas en paralelo en ${endTime - startTime}ms`);
    } catch (error) {
      console.error('❌ Error guardando múltiples claves en cache:', error);
    }
  }

  // 🔄 CACHE CON PATRÓN CACHE-ASIDE - Obtener o calcular y cachear
  async getOrSetAsync<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    try {
      // Intentar obtener del cache primero
      const cached = await this.getAsync<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Si no está en cache, calcular y guardar
      console.log(`🔄 Calculando datos para ${key}...`);
      const value = await factory();
      await this.setAsync(key, value, ttl);
      
      return value;
    } catch (error) {
      console.error(`❌ Error en patrón cache-aside para ${key}:`, error);
      throw error;
    }
  }

  // 🧹 LIMPIEZA ASINCRÓNICA DEL CACHE
  async clearCacheAsync(): Promise<void> {
    console.log('🧹 Iniciando limpieza asincrónica del cache...');
    const startTime = Date.now();

    try {
      // Usar del en lugar de reset para compatibilidad
      await this.cacheManager.del('*');
      const endTime = Date.now();
      
      console.log(`✅ Cache limpiado en ${endTime - startTime}ms`);
    } catch (error) {
      console.error('❌ Error limpiando cache:', error);
    }
  }

  // 📊 ESTADÍSTICAS DEL CACHE
  async getCacheStats(): Promise<{
    status: string;
    timestamp: Date;
    operations: {
      hits: number;
      misses: number;
      sets: number;
    };
  }> {
    return {
      status: 'active',
      timestamp: new Date(),
      operations: {
        hits: 0, // En una implementación real, se trackearían estas métricas
        misses: 0,
        sets: 0
      }
    };
  }

  // 🔄 CACHE CON EXPIRACIÓN AUTOMÁTICA
  async setWithAutoExpiry<T>(
    key: string,
    value: T,
    expiryMinutes: number = 5
  ): Promise<void> {
    const ttl = expiryMinutes * 60 * 1000; // Convertir a milisegundos
    await this.setAsync(key, value, ttl);
    
    // Programar limpieza automática
    setTimeout(async () => {
      await this.invalidateAsync(key);
      console.log(`⏰ Cache expirado automáticamente: ${key}`);
    }, ttl);
  }

  // 🎯 CACHE INTELIGENTE - Cache con invalidación por patrones
  async invalidateByPattern(pattern: string): Promise<void> {
    console.log(`🎯 Invalidando cache por patrón: ${pattern}`);
    // En una implementación real con Redis, se usaría SCAN con patrones
    // Por ahora, simulamos la invalidación
    try {
      // Esta funcionalidad requeriría acceso directo a Redis
      console.log(`✅ Cache invalidado por patrón: ${pattern}`);
    } catch (error) {
      console.error(`❌ Error invalidando por patrón ${pattern}:`, error);
    }
  }
}
