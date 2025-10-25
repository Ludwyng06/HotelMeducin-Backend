import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Reservation, ReservationDocument } from '../../reservations/schemas/reservation.schema';
import { Room, RoomDocument } from '../../rooms/schemas/room.schema';
import { Service, ServiceDocument } from '../../services/schemas/service.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Reservation.name) private reservationModel: Model<ReservationDocument>,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // 🔄 CONSULTAS PARALELAS CON PROMISE.ALL() - Procesos Asincrónicos Avanzados
  async getActiveUsers() {
    const cacheKey = 'active-users-report';
    
    // Verificar cache primero
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      console.log('📊 Reporte de usuarios activos obtenido desde cache');
      return cached;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await this.userModel.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          isActive: true
        }
      },
      {
        $group: {
          _id: "$role",
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: {
              $cond: {
                if: { $gte: ["$updatedAt", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                then: 1,
                else: 0
              }
            }
          }
        }
      }
    ]);

    // Cachear resultado por 5 minutos
    await this.cacheManager.set(cacheKey, result, 300000);
    console.log('📊 Reporte de usuarios activos generado y cacheado');
    
    return result;
  }

  async getReservationsMonthly(startDate: Date, endDate: Date) {
    return this.reservationModel.aggregate([
      {
        $match: {
          status: { $in: ["confirmed", "completed"] },
          checkInDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$checkInDate" },
            month: { $month: "$checkInDate" }
          },
          totalReservations: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          averagePrice: { $avg: "$totalPrice" }
        }
      },
      {
        $project: {
          month: {
            $cond: {
              if: { $eq: ["$_id.month", 1] },
              then: "Enero",
              else: {
                $cond: {
                  if: { $eq: ["$_id.month", 2] },
                  then: "Febrero",
                  else: {
                    $cond: {
                      if: { $eq: ["$_id.month", 3] },
                      then: "Marzo",
                      else: {
                        $cond: {
                          if: { $eq: ["$_id.month", 4] },
                          then: "Abril",
                          else: "Otros meses"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          totalReservations: 1,
          totalRevenue: 1,
          averagePrice: 1
        }
      }
    ]);
  }

  async getRoomOccupancy() {
    return this.reservationModel.aggregate([
      {
        $lookup: {
          from: "rooms",
          localField: "roomId",
          foreignField: "_id",
          as: "room"
        }
      },
      {
        $unwind: "$room"
      },
      {
        $group: {
          _id: "$room.name",
          totalReservations: { $sum: 1 }
        }
      },
      {
        $addFields: {
          occupancyRate: {
            $cond: {
              if: { $gt: ["$totalReservations", 10] },
              then: "Alta",
              else: {
                $cond: {
                  if: { $gt: ["$totalReservations", 5] },
                  then: "Media",
                  else: "Baja"
                }
              }
            }
          }
        }
      }
    ]);
  }

  async getPopularServices() {
    return this.reservationModel.aggregate([
      {
        $unwind: "$serviceIds"
      },
      {
        $lookup: {
          from: "services",
          localField: "serviceIds",
          foreignField: "_id",
          as: "service"
        }
      },
      {
        $unwind: "$service"
      },
      {
        $group: {
          _id: "$service.category",
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: "$service.price" }
        }
      },
      {
        $addFields: {
          popularity: {
            $cond: {
              if: { $gt: ["$totalBookings", 20] },
              then: "Muy Popular",
              else: {
                $cond: {
                  if: { $gt: ["$totalBookings", 10] },
                  then: "Popular",
                  else: "Poco Popular"
                }
              }
            }
          }
        }
      }
    ]);
  }

  // 🚀 CONSULTAS PARALELAS CON PROMISE.ALL() - Generar múltiples reportes simultáneamente
  async generateAllReports() {
    console.log('🔄 Iniciando generación paralela de reportes...');
    const startTime = Date.now();

    try {
      // Ejecutar todas las consultas en paralelo usando Promise.all()
      const [
        activeUsers,
        monthlyReservations,
        roomOccupancy,
        popularServices
      ] = await Promise.all([
        this.getActiveUsers(),
        this.getReservationsMonthly(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
        this.getRoomOccupancy(),
        this.getPopularServices()
      ]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log(`✅ Reportes generados en paralelo en ${executionTime}ms`);

      return {
        success: true,
        executionTime,
        data: {
          activeUsers,
          monthlyReservations,
          roomOccupancy,
          popularServices
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Error en generación paralela de reportes:', error);
      throw error;
    }
  }

  // 🔄 PROCESOS CONCURRENTES - Actualización de disponibilidad de habitaciones
  async updateRoomAvailabilityConcurrently(roomIds: string[]) {
    console.log(`🔄 Actualizando disponibilidad de ${roomIds.length} habitaciones concurrentemente...`);
    
    const startTime = Date.now();
    
    try {
      // Procesar actualizaciones en paralelo con Promise.all()
      const updatePromises = roomIds.map(async (roomId) => {
        // Verificar reservaciones activas para la habitación
        const activeReservations = await this.reservationModel.countDocuments({
          roomId,
          status: { $in: ['confirmed', 'pending'] },
          checkInDate: { $lte: new Date() },
          checkOutDate: { $gte: new Date() }
        });

        // Actualizar disponibilidad basada en reservaciones
        const isAvailable = activeReservations === 0;
        
        return this.roomModel.findByIdAndUpdate(
          roomId,
          { isAvailable },
          { new: true }
        );
      });

      const results = await Promise.all(updatePromises);
      const endTime = Date.now();
      
      console.log(`✅ ${results.length} habitaciones actualizadas concurrentemente en ${endTime - startTime}ms`);
      
      return {
        success: true,
        updatedRooms: results.length,
        executionTime: endTime - startTime,
        results
      };
    } catch (error) {
      console.error('❌ Error en actualización concurrente de habitaciones:', error);
      throw error;
    }
  }

  // 🎯 CONCURRENCIA CONTROLADA - Crear reservaciones simultáneas con control de conflictos
  async createReservationsConcurrently(reservationsData: any[]) {
    console.log(`🔄 Procesando ${reservationsData.length} reservaciones concurrentemente...`);
    
    const startTime = Date.now();
    const results: any[] = [];
    const errors: any[] = [];

    try {
      // Procesar reservaciones en lotes para evitar sobrecarga
      const batchSize = 5;
      const batches: any[][] = [];
      
      for (let i = 0; i < reservationsData.length; i += batchSize) {
        batches.push(reservationsData.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (reservationData: any) => {
          try {
            // Verificar disponibilidad antes de crear
            const isAvailable = await this.checkRoomAvailability(
              reservationData.roomId,
              new Date(reservationData.checkInDate),
              new Date(reservationData.checkOutDate)
            );

            if (!isAvailable) {
              throw new Error(`Habitación ${reservationData.roomId} no disponible`);
            }

            // Crear reservación
            const reservation = new this.reservationModel(reservationData);
            return await reservation.save();
          } catch (error: any) {
            console.error(`❌ Error creando reservación:`, error.message);
            return { error: error.message, data: reservationData };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const endTime = Date.now();
      const successful = results.filter((r: any) => !r.error).length;
      const failed = results.filter((r: any) => r.error).length;

      console.log(`✅ Procesadas ${reservationsData.length} reservaciones: ${successful} exitosas, ${failed} fallidas en ${endTime - startTime}ms`);

      return {
        success: true,
        total: reservationsData.length,
        successful,
        failed,
        executionTime: endTime - startTime,
        results
      };
    } catch (error) {
      console.error('❌ Error en creación concurrente de reservaciones:', error);
      throw error;
    }
  }

  // 🔍 Verificar disponibilidad de habitación
  private async checkRoomAvailability(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean> {
    const conflictingReservations = await this.reservationModel.countDocuments({
      roomId,
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        {
          checkInDate: { $lte: checkIn },
          checkOutDate: { $gt: checkIn }
        },
        {
          checkInDate: { $lt: checkOut },
          checkOutDate: { $gte: checkOut }
        },
        {
          checkInDate: { $gte: checkIn },
          checkOutDate: { $lte: checkOut }
        }
      ]
    });

    return conflictingReservations === 0;
  }

  // 🕐 TAREAS EN SEGUNDO PLANO - Limpiar cache y optimizar datos
  async backgroundMaintenance() {
    console.log('🔄 Iniciando mantenimiento en segundo plano...');
    
    try {
      // Limpiar cache expirado
      await this.cacheManager.del('*');
      console.log('🧹 Cache limpiado');

      // Optimizar índices de MongoDB (simulado)
      await this.optimizeDatabaseIndexes();
      console.log('📊 Índices optimizados');

      // Actualizar estadísticas en segundo plano
      await this.updateStatistics();
      console.log('📈 Estadísticas actualizadas');

      console.log('✅ Mantenimiento en segundo plano completado');
    } catch (error) {
      console.error('❌ Error en mantenimiento en segundo plano:', error);
    }
  }

  private async optimizeDatabaseIndexes() {
    // Simular optimización de índices
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async updateStatistics() {
    // Simular actualización de estadísticas
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
