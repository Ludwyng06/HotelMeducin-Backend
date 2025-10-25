import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Service, ServiceDocument } from '../schemas/service.schema';
import { CreateServiceDto } from '../dto/create-service.dto';

@Injectable()
export class ServicesService {
  constructor(@InjectModel(Service.name) private serviceModel: Model<ServiceDocument>) {}

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    const createdService = new this.serviceModel(createServiceDto);
    return createdService.save();
  }

  async findAll(): Promise<Service[]> {
    return this.serviceModel.find().exec();
  }

  async findByCategory(category: string): Promise<Service[]> {
    return this.serviceModel.find({ category, isAvailable: true }).exec();
  }

  async findAvailable(): Promise<Service[]> {
    return this.serviceModel.find({ isAvailable: true }).exec();
  }

  async findOne(id: string): Promise<Service | null> {
    return this.serviceModel.findById(id).exec();
  }

  async update(id: string, updateData: Partial<Service>): Promise<Service | null> {
    return this.serviceModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async remove(id: string): Promise<Service | null> {
    return this.serviceModel.findByIdAndDelete(id).exec();
  }

  async bookService(serviceId: string, userId: string): Promise<any> {
    // Lógica para reservar un servicio
    const service = await this.findOne(serviceId);
    if (!service || !service.isAvailable) {
      throw new Error('Servicio no disponible');
    }
    
    return {
      serviceId,
      userId,
      bookedAt: new Date(),
      status: 'booked'
    };
  }
}
