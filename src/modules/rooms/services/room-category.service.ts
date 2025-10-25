import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoomCategory, RoomCategoryDocument } from '../schemas/room-category.schema';

@Injectable()
export class RoomCategoryService {
  constructor(
    @InjectModel(RoomCategory.name) 
    private roomCategoryModel: Model<RoomCategoryDocument>
  ) {}

  // Obtener todas las categorías activas
  async findAll(): Promise<RoomCategory[]> {
    return this.roomCategoryModel.find({ isActive: true }).exec();
  }

  // Obtener categoría por ID
  async findOne(id: string): Promise<RoomCategory | null> {
    return this.roomCategoryModel.findById(id).exec();
  }

  // Obtener categoría por código
  async findByCode(code: string): Promise<RoomCategory | null> {
    return this.roomCategoryModel.findOne({ code, isActive: true }).exec();
  }

  // Obtener categorías por rango de precio
  async findByPriceRange(minPrice: number, maxPrice: number): Promise<RoomCategory[]> {
    return this.roomCategoryModel.find({
      basePrice: { $gte: minPrice, $lte: maxPrice },
      isActive: true
    }).exec();
  }

  // Obtener categorías por capacidad
  async findByCapacity(capacity: number): Promise<RoomCategory[]> {
    return this.roomCategoryModel.find({
      maxCapacity: { $gte: capacity },
      isActive: true
    }).exec();
  }

  // Crear nueva categoría (solo admin)
  async create(categoryData: Partial<RoomCategory>): Promise<RoomCategory> {
    const category = new this.roomCategoryModel(categoryData);
    return category.save();
  }

  // Actualizar categoría (solo admin)
  async update(id: string, updateData: Partial<RoomCategory>): Promise<RoomCategory | null> {
    return this.roomCategoryModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  // Desactivar categoría (solo admin)
  async deactivate(id: string): Promise<RoomCategory | null> {
    return this.roomCategoryModel.findByIdAndUpdate(
      id, 
      { isActive: false }, 
      { new: true }
    ).exec();
  }

  // Obtener estadísticas de categorías
  async getStats() {
    return this.roomCategoryModel.aggregate([
      {
        $lookup: {
          from: 'rooms',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'rooms'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          basePrice: 1,
          maxCapacity: 1,
          totalRooms: { $size: '$rooms' },
          availableRooms: {
            $size: {
              $filter: {
                input: '$rooms',
                cond: { $eq: ['$$this.isAvailable', true] }
              }
            }
          }
        }
      },
      { $sort: { basePrice: 1 } }
    ]);
  }
}
