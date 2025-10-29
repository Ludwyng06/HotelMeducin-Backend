import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomDocument } from '@models/rooms/room.schema';
import { RoomCategory, RoomCategoryDocument } from '@models/rooms/room-category.schema';
import { CreateRoomDto } from '@models/rooms/dto/create-room.dto';
import { RedisService } from '@config/redis.service';

@Injectable()
export class RoomsService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(RoomCategory.name) private roomCategoryModel: Model<RoomCategoryDocument>,
    private redisService: RedisService
  ) {}

  async create(createRoomDto: CreateRoomDto): Promise<Room> {
    const createdRoom = new this.roomModel(createRoomDto as any);
    return createdRoom.save();
  }

  async findAll(): Promise<Room[]> {
    return this.roomModel.find().populate('categoryId').exec();
  }

  async findAvailable(): Promise<Room[]> {
    try {
      // Consultar directamente la base de datos (sin Redis temporalmente)
      console.log('🗄️ Consultando base de datos para habitaciones disponibles...');
      const rooms = await this.roomModel.find({ 
        isAvailable: true, 
        isMaintenance: false 
      }).populate('categoryId').exec();
      
      console.log(`✅ ${rooms.length} habitaciones disponibles encontradas`);
      return rooms;
    } catch (error) {
      console.error('❌ Error en findAvailable:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Room | null> {
    try {
      // Consultar directamente la base de datos (sin Redis temporalmente)
      console.log('🗄️ Consultando base de datos para habitación:', id);
      const room = await this.roomModel.findById(id).populate('categoryId').exec();
      
      if (room) {
        console.log('✅ Habitación encontrada:', room.name);
      } else {
        console.log('❌ Habitación no encontrada:', id);
      }
      
      return room;
    } catch (error) {
      console.error('❌ Error en findOne:', error);
      throw error;
    }
  }

  async findByRoomNumber(roomNumber: string): Promise<Room | null> {
    return this.roomModel.findOne({ roomNumber }).populate('categoryId').exec();
  }

  async findByCategory(categoryId: string): Promise<Room[]> {
    // 1. Intentar obtener del cache de Redis
    const cacheKey = `rooms:category:${categoryId}`;
    const cachedRooms = await this.redisService.getCachedAvailableRooms();
    if (cachedRooms && cachedRooms.length > 0) {
      // Filtrar por categoría en el cache
      const categoryRooms = cachedRooms.filter(room => 
        room.categoryId?._id?.toString() === categoryId || 
        room.categoryId?.toString() === categoryId
      );
      if (categoryRooms.length > 0) {
        console.log('🏨 Habitaciones de categoría obtenidas del cache Redis:', categoryId);
        return categoryRooms;
      }
    }
    
    // 2. Si no hay cache, consultar la base de datos
    console.log('🗄️ Consultando base de datos para categoría:', categoryId);
    const objectId = new (require('mongoose').Types.ObjectId)(categoryId);
    const rooms = await this.roomModel.find({ categoryId: objectId }).populate('categoryId').exec();
    
    // 3. Guardar en cache de Redis (5 minutos)
    await this.redisService.cacheAvailableRooms(rooms, 300);
    console.log('💾 Habitaciones de categoría guardadas en cache Redis:', categoryId);
    
    return rooms;
  }

  async findByFloor(floor: number): Promise<Room[]> {
    return this.roomModel.find({ floor }).populate('categoryId').exec();
  }

  async searchRooms(filters: any): Promise<Room[]> {
    const query: any = {};
    
    if (filters.priceMin) query.price = { $gte: filters.priceMin };
    if (filters.priceMax) query.price = { ...query.price, $lte: filters.priceMax };
    if (filters.capacity) query.capacity = { $gte: filters.capacity };
    if (filters.floor) query.floor = filters.floor;
    if (filters.view) query.view = { $regex: filters.view, $options: 'i' };
    if (filters.isAvailable !== undefined) query.isAvailable = filters.isAvailable;
    if (filters.categoryId) query.categoryId = filters.categoryId;
    if (filters.amenities) {
      query.amenities = { $in: filters.amenities };
    }
    
    return this.roomModel.find(query).populate('categoryId').exec();
  }

  async checkAvailability(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean> {
    // Esta lógica se implementará con las reservaciones
    const room = await this.findOne(roomId);
    return room ? room.isAvailable && !room.isMaintenance : false;
  }

  async getAvailableRoomsByDateRange(checkIn: Date, checkOut: Date): Promise<Room[]> {
    // Implementar lógica de disponibilidad con reservaciones
    return this.roomModel.find({ 
      isAvailable: true, 
      isMaintenance: false 
    }).populate('categoryId').exec();
  }

  async update(id: string, updateData: Partial<Room>): Promise<Room | null> {
    const updatedRoom = await this.roomModel.findByIdAndUpdate(id, updateData, { new: true }).populate('categoryId').exec();
    
    if (updatedRoom) {
      // Invalidar cache de Redis
      await this.redisService.invalidateRoomCache(id);
      await this.redisService.invalidateAvailableRoomsCache();
      
      // Actualizar cache con nuevos datos
      await this.redisService.cacheRoomHash(id, updatedRoom, 600);
      console.log('🗑️ Cache invalidado y actualizado para habitación:', id);
    }
    
    return updatedRoom;
  }

  async updateAvailability(id: string, isAvailable: boolean): Promise<Room | null> {
    return this.roomModel.findByIdAndUpdate(
      id, 
      { isAvailable }, 
      { new: true }
    ).populate('categoryId').exec();
  }

  async setMaintenance(id: string, isMaintenance: boolean): Promise<Room | null> {
    return this.roomModel.findByIdAndUpdate(
      id, 
      { isMaintenance }, 
      { new: true }
    ).populate('categoryId').exec();
  }

  async remove(id: string): Promise<Room | null> {
    return this.roomModel.findByIdAndDelete(id).exec();
  }

  // Obtener estadísticas de habitaciones
  async getStats() {
    return this.roomModel.aggregate([
      {
        $lookup: {
          from: 'roomcategories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $group: {
          _id: { $arrayElemAt: ['$category.name', 0] },
          totalRooms: { $sum: 1 },
          availableRooms: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$isAvailable', true] }, { $eq: ['$isMaintenance', false] }] },
                1,
                0
              ]
            }
          },
          maintenanceRooms: {
            $sum: {
              $cond: [{ $eq: ['$isMaintenance', true] }, 1, 0]
            }
          },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      },
      { $sort: { avgPrice: 1 } }
    ]);
  }
}
