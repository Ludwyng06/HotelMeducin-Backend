import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Room, RoomDocument } from '../schemas/room.schema';
import { RoomCategory, RoomCategoryDocument } from '../schemas/room-category.schema';
import { CreateRoomDto } from '../dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(RoomCategory.name) private roomCategoryModel: Model<RoomCategoryDocument>
  ) {}

  async create(createRoomDto: CreateRoomDto): Promise<Room> {
    const createdRoom = new this.roomModel(createRoomDto);
    return createdRoom.save();
  }

  async findAll(): Promise<Room[]> {
    return this.roomModel.find().populate('categoryId').exec();
  }

  async findAvailable(): Promise<Room[]> {
    return this.roomModel.find({ isAvailable: true, isMaintenance: false }).populate('categoryId').exec();
  }

  async findOne(id: string): Promise<Room | null> {
    return this.roomModel.findById(id).populate('categoryId').exec();
  }

  async findByRoomNumber(roomNumber: string): Promise<Room | null> {
    return this.roomModel.findOne({ roomNumber }).populate('categoryId').exec();
  }

  async findByCategory(categoryId: string): Promise<Room[]> {
    const objectId = new Types.ObjectId(categoryId);
    return this.roomModel.find({ categoryId: objectId }).populate('categoryId').exec();
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
    return this.roomModel.findByIdAndUpdate(id, updateData, { new: true }).populate('categoryId').exec();
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
