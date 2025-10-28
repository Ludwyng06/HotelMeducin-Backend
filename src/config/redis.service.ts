import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: RedisClientType;
  
  // Getter para acceder al cliente desde otros módulos
  get client(): RedisClientType {
    return this.redisClient;
  }

  async onModuleInit() {
    this.redisClient = createClient({
      url: `redis://localhost:6379`,
    });

    this.redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    this.redisClient.on('connect', () => {
      console.log('✅ Redis Client Connected');
    });

    await this.redisClient.connect();
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.disconnect();
    }
  }

  // Métodos básicos de Redis
  async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redisClient.setEx(key, ttl, value);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  // Métodos específicos para el hotel
  async cacheRoomOccupiedDates(roomId: string, dates: string[], ttl: number = 600): Promise<void> {
    const key = `occupied_dates:${roomId}`;
    await this.set(key, JSON.stringify(dates), ttl);
    console.log(`📅 Cached occupied dates for room ${roomId}:`, dates);
  }

  async getCachedRoomOccupiedDates(roomId: string): Promise<string[] | null> {
    const key = `occupied_dates:${roomId}`;
    const cached = await this.get(key);
    if (cached) {
      console.log(`📅 Retrieved cached occupied dates for room ${roomId}`);
      return JSON.parse(cached);
    }
    return null;
  }

  // 🚀 NUEVAS FUNCIONES AVANZADAS DE REDIS

  // 1. HASH CACHE para habitaciones (mejor rendimiento)
  async cacheRoomHash(roomId: string, roomData: any, ttl: number = 600): Promise<void> {
    const key = `room:${roomId}`;
    
    // Usar hSet con pares clave-valor individuales
    await this.redisClient.hSet(key, 'id', roomData._id || roomId);
    await this.redisClient.hSet(key, 'name', roomData.name || '');
    await this.redisClient.hSet(key, 'roomNumber', roomData.roomNumber || '');
    await this.redisClient.hSet(key, 'price', roomData.price?.toString() || '0');
    await this.redisClient.hSet(key, 'capacity', roomData.capacity?.toString() || '1');
    await this.redisClient.hSet(key, 'bedType', roomData.bedType || '');
    await this.redisClient.hSet(key, 'floor', roomData.floor?.toString() || '1');
    await this.redisClient.hSet(key, 'view', roomData.view || '');
    await this.redisClient.hSet(key, 'isAvailable', roomData.isAvailable?.toString() || 'true');
    await this.redisClient.hSet(key, 'isMaintenance', roomData.isMaintenance?.toString() || 'false');
    await this.redisClient.hSet(key, 'categoryId', roomData.categoryId?._id || roomData.categoryId || '');
    await this.redisClient.hSet(key, 'categoryName', roomData.categoryId?.name || '');
    await this.redisClient.hSet(key, 'amenities', JSON.stringify(roomData.amenities || []));
    await this.redisClient.hSet(key, 'imageUrls', JSON.stringify(roomData.imageUrls || []));
    await this.redisClient.hSet(key, 'occupiedDates', JSON.stringify(roomData.occupiedDates || []));
    await this.redisClient.hSet(key, 'lastUpdated', new Date().toISOString());
    
    await this.redisClient.expire(key, ttl);
    console.log(`🏨 Cached room hash for ${roomId}`);
  }

  async getCachedRoomHash(roomId: string): Promise<any | null> {
    const key = `room:${roomId}`;
    const exists = await this.redisClient.exists(key);
    if (!exists) return null;
    
    const hashData = await this.redisClient.hGetAll(key);
    if (Object.keys(hashData).length === 0) return null;
    
    // Convertir de hash a objeto
    const roomData = {
      _id: hashData.id,
      name: hashData.name,
      roomNumber: hashData.roomNumber,
      price: parseInt(hashData.price || '0'),
      capacity: parseInt(hashData.capacity || '1'),
      bedType: hashData.bedType,
      floor: parseInt(hashData.floor || '1'),
      view: hashData.view,
      isAvailable: hashData.isAvailable === 'true',
      isMaintenance: hashData.isMaintenance === 'true',
      categoryId: {
        _id: hashData.categoryId,
        name: hashData.categoryName
      },
      amenities: JSON.parse(hashData.amenities || '[]'),
      imageUrls: JSON.parse(hashData.imageUrls || '[]'),
      occupiedDates: JSON.parse(hashData.occupiedDates || '[]'),
      lastUpdated: hashData.lastUpdated
    };
    
    console.log(`🏨 Retrieved cached room hash for ${roomId}`);
    return roomData;
  }

  async updateRoomHashField(roomId: string, field: string, value: string): Promise<void> {
    const key = `room:${roomId}`;
    await this.redisClient.hSet(key, field, value);
    console.log(`🏨 Updated room hash field ${field} for ${roomId}`);
  }

  async getRoomHashField(roomId: string, field: string): Promise<string | null> {
    const key = `room:${roomId}`;
    return await this.redisClient.hGet(key, field);
  }

  async cacheAvailableRooms(rooms: any[], ttl: number = 300): Promise<void> {
    const key = 'available_rooms';
    await this.set(key, JSON.stringify(rooms), ttl);
    console.log(`🏨 Cached ${rooms.length} available rooms`);
  }

  async getCachedAvailableRooms(): Promise<any[] | null> {
    const key = 'available_rooms';
    const cached = await this.get(key);
    if (cached) {
      console.log('🏨 Retrieved cached available rooms');
      return JSON.parse(cached);
    }
    return null;
  }

  // Rate limiting para login
  async checkLoginAttempts(email: string): Promise<{ attempts: number; canLogin: boolean }> {
    const key = `login_attempts:${email}`;
    const attempts = await this.client.incr(key);
    
    if (attempts === 1) {
      await this.client.expire(key, 900); // 15 minutos
    }
    
    return {
      attempts,
      canLogin: attempts <= 5
    };
  }

  async resetLoginAttempts(email: string): Promise<void> {
    const key = `login_attempts:${email}`;
    await this.del(key);
  }

  // Cache de sesiones activas
  async createSession(token: string, userId: string, ttl: number = 86400): Promise<void> {
    const key = `session:${token}`;
    await this.set(key, userId, ttl);
    console.log(`🔐 Created session for user ${userId}`);
  }

  async getSession(token: string): Promise<string | null> {
    const key = `session:${token}`;
    return await this.get(key);
  }

  async deleteSession(token: string): Promise<void> {
    const key = `session:${token}`;
    await this.del(key);
    console.log(`🔐 Deleted session for token ${token}`);
  }

  // Invalidar cache cuando se crea una nueva reserva
  async invalidateRoomCache(roomId: string): Promise<void> {
    const key = `occupied_dates:${roomId}`;
    await this.del(key);
    console.log(`🗑️ Invalidated cache for room ${roomId}`);
  }

  async invalidateAvailableRoomsCache(): Promise<void> {
    const key = 'available_rooms';
    await this.del(key);
    console.log('🗑️ Invalidated available rooms cache');
  }

  // 2. MÉTRICAS Y CONTADORES (analytics en tiempo real)
  
  // Reservas por día
  async incrementDailyReservations(date: string): Promise<number> {
    const key = `reservations:${date}`;
    const count = await this.redisClient.incr(key);
    await this.redisClient.expire(key, 86400 * 30); // 30 días
    console.log(`📊 Daily reservations for ${date}: ${count}`);
    return count;
  }

  async getDailyReservations(date: string): Promise<number> {
    const key = `reservations:${date}`;
    const count = await this.redisClient.get(key);
    return parseInt(count || '0');
  }

  // Ingresos diarios
  async addDailyRevenue(date: string, amount: number): Promise<number> {
    const key = `revenue:${date}`;
    const total = await this.redisClient.incrBy(key, amount);
    await this.redisClient.expire(key, 86400 * 30); // 30 días
    console.log(`💰 Daily revenue for ${date}: $${total}`);
    return total;
  }

  async getDailyRevenue(date: string): Promise<number> {
    const key = `revenue:${date}`;
    const revenue = await this.redisClient.get(key);
    return parseInt(revenue || '0');
  }

  // Habitaciones ocupadas
  async incrementOccupiedRooms(): Promise<number> {
    const key = 'rooms:occupied';
    const count = await this.redisClient.incr(key);
    console.log(`🏨 Occupied rooms: ${count}`);
    return count;
  }

  async decrementOccupiedRooms(): Promise<number> {
    const key = 'rooms:occupied';
    const count = await this.redisClient.decr(key);
    if (count < 0) {
      await this.redisClient.set(key, '0');
      return 0;
    }
    console.log(`🏨 Occupied rooms: ${count}`);
    return count;
  }

  async getOccupiedRoomsCount(): Promise<number> {
    const key = 'rooms:occupied';
    const count = await this.redisClient.get(key);
    return parseInt(count || '0');
  }

  // Usuarios activos
  async incrementActiveUsers(): Promise<number> {
    const key = 'users:active';
    const count = await this.redisClient.incr(key);
    console.log(`👥 Active users: ${count}`);
    return count;
  }

  async decrementActiveUsers(): Promise<number> {
    const key = 'users:active';
    const count = await this.redisClient.decr(key);
    if (count < 0) {
      await this.redisClient.set(key, '0');
      return 0;
    }
    console.log(`👥 Active users: ${count}`);
    return count;
  }

  async getActiveUsersCount(): Promise<number> {
    const key = 'users:active';
    const count = await this.redisClient.get(key);
    return parseInt(count || '0');
  }

  // Métricas combinadas
  async getHotelMetrics(): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    
    const metrics = {
      today: {
        reservations: await this.getDailyReservations(today),
        revenue: await this.getDailyRevenue(today)
      },
      current: {
        occupiedRooms: await this.getOccupiedRoomsCount(),
        activeUsers: await this.getActiveUsersCount()
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 Hotel metrics retrieved:', metrics);
    return metrics;
  }

  // Limpiar métricas (para testing)
  async clearMetrics(): Promise<void> {
    const keys = await this.redisClient.keys('reservations:*');
    const revenueKeys = await this.redisClient.keys('revenue:*');
    const allKeys = [...keys, ...revenueKeys, 'rooms:occupied', 'users:active'];
    
    if (allKeys.length > 0) {
      await this.redisClient.del(allKeys);
    }
    console.log('🗑️ Metrics cleared');
  }
}
