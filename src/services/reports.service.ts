import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { User, UserDocument } from '@models/users/user.schema';
import { Reservation, ReservationDocument } from '@models/reservations/reservation.schema';
import { Room, RoomDocument } from '@models/rooms/room.schema';
import { Service, ServiceDocument } from '@models/services/service.schema';

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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const result = await this.userModel.aggregate([
      {
        $match: {
          isActive: true
        }
      },
      // Hacer lookup del rol para obtener el nombre
      {
        $lookup: {
          from: 'userroles',
          localField: 'roleId',
          foreignField: '_id',
          as: 'role'
        }
      },
      // Desenrollar el array de rol (debería ser solo uno)
      {
        $unwind: {
          path: '$role',
          preserveNullAndEmptyArrays: true // Mantener usuarios sin rol asignado
        }
      },
      // Agrupar por nombre del rol
      {
        $group: {
          _id: '$role.name', // Usar el nombre del rol
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: {
              $cond: {
                if: { $gte: ['$updatedAt', sevenDaysAgo] },
                then: 1,
                else: 0
              }
            }
          },
          recentlyCreated: {
            $sum: {
              $cond: {
                if: { $gte: ['$createdAt', thirtyDaysAgo] },
                then: 1,
                else: 0
              }
            }
          }
        }
      },
      // Ordenar por nombre de rol
      {
        $sort: {
          _id: 1
        }
      }
    ]);

    // Cachear resultado por 5 minutos
    await this.cacheManager.set(cacheKey, result, 300000);
    console.log('📊 Reporte de usuarios activos generado y cacheado');
    
    return result;
  }

  async getReservationsToday() {
    // Usar exactamente la misma lógica que Neo4j para garantizar consistencia
    // Neo4j filtra con: res.checkInDate STARTS WITH $todayDateOnly
    // donde todayDateOnly se obtiene así:
    //   const today = new Date();
    //   today.setHours(0, 0, 0, 0);
    //   const todayDateOnly = today.toISOString().split('T')[0]; // "2025-12-14"
    // Esto significa que busca cualquier fecha que empiece con "2025-12-14"
    // En Neo4j, las fechas se guardan como strings ISO completos (ej: "2025-12-14T00:00:00.000Z")
    
    // Usar EXACTAMENTE la misma lógica que Neo4j
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDateOnly = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Crear rango para el día completo (igual que Neo4j calcula)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayStart = today.toISOString(); // 2025-12-14T00:00:00.000Z
    const tomorrowStart = tomorrow.toISOString(); // 2025-12-15T00:00:00.000Z

    console.log(`📅 [getReservationsToday] Filtrando reservaciones del día: ${todayDateOnly}`);
    console.log(`📅 [getReservationsToday] Rango: ${todayStart} a ${tomorrowStart}`);
    console.log(`📅 [getReservationsToday] Fecha legible: ${today.toLocaleDateString('es-CO')}`);

    // Usar agregación con $dateToString para comparar solo la parte de fecha (YYYY-MM-DD)
    // IMPORTANTE: Usar timezone: 'UTC' porque Neo4j guarda las fechas como strings ISO en UTC
    // (ver línea 523 de neo4j.service.ts: new Date(reservation.checkInDate).toISOString())
    // Esto garantiza que ambos sistemas usen la misma zona horaria para comparar fechas
    const allReservations = await this.reservationModel.aggregate([
      {
        $match: {
          $expr: {
            $eq: [
              { $dateToString: { format: '%Y-%m-%d', date: '$checkInDate', timezone: 'UTC' } },
              todayDateOnly
            ]
          }
        }
      },
      {
        $project: {
          status: 1,
          totalPrice: 1,
          checkInDate: 1,
          _id: 1
        }
      }
    ]);

    console.log(`📊 [getReservationsToday] Reservaciones encontradas: ${allReservations.length}`);
    
    if (allReservations.length > 0) {
      console.log(`📊 [getReservationsToday] Primeras reservaciones:`, allReservations.slice(0, 5).map(r => ({
        id: r._id?.toString() || 'N/A',
        checkInDate: r.checkInDate instanceof Date ? r.checkInDate.toISOString() : r.checkInDate,
        status: r.status,
        totalPrice: r.totalPrice
      })));
    } else {
      // Si no encuentra reservaciones, buscar algunas para debug
      const sampleReservations = await this.reservationModel.find({})
        .select('checkInDate status totalPrice')
        .sort({ checkInDate: -1 })
        .limit(5)
        .lean();
      console.log(`📊 [getReservationsToday] DEBUG: Últimas 5 reservaciones en BD:`, sampleReservations.map(r => ({
        checkInDate: r.checkInDate instanceof Date ? r.checkInDate.toISOString() : r.checkInDate,
        status: r.status
      })));
    }

    // Calcular métricas manualmente
    const total = allReservations.length;
    
    // Calcular ingresos solo de reservaciones confirmadas y completadas
    // Las pendientes son inciertas (pueden cancelarse) y las canceladas no generan ingresos
    // Solo las confirmadas y completadas representan ingresos reales garantizados
    const totalRevenue = allReservations
      .filter(r => r.status === 'confirmed' || r.status === 'completed')
      .reduce((sum, r) => sum + (r.totalPrice || 0), 0);
    
    const byStatus = {
      pending: allReservations.filter(r => r.status === 'pending').length,
      confirmed: allReservations.filter(r => r.status === 'confirmed').length,
      cancelled: allReservations.filter(r => r.status === 'cancelled').length,
      completed: allReservations.filter(r => r.status === 'completed').length,
    };

    console.log(`📊 [getReservationsToday] Total: ${total}, Por status:`, byStatus);
    console.log(`📊 [getReservationsToday] Ingresos totales: $${totalRevenue}`);

    return {
      total,
      totalRevenue,
      byStatus,
      date: todayDateOnly // Usar el mismo formato que Neo4j
    };
  }

  async getReservationsMonthly(startDate: Date, endDate: Date) {
    return this.reservationModel.aggregate([
      {
        $match: {
          // Remover filtro de status para incluir TODAS las reservas
          // status: { $in: ["confirmed", "completed"] },
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
                          else: {
                            $cond: {
                              if: { $eq: ["$_id.month", 5] },
                              then: "Mayo",
                              else: {
                                $cond: {
                                  if: { $eq: ["$_id.month", 6] },
                                  then: "Junio",
                                  else: {
                                    $cond: {
                                      if: { $eq: ["$_id.month", 7] },
                                      then: "Julio",
                                      else: {
                                        $cond: {
                                          if: { $eq: ["$_id.month", 8] },
                                          then: "Agosto",
                                          else: {
                                            $cond: {
                                              if: { $eq: ["$_id.month", 9] },
                                              then: "Septiembre",
                                              else: {
                                                $cond: {
                                                  if: { $eq: ["$_id.month", 10] },
                                                  then: "Octubre",
                                                  else: {
                                                    $cond: {
                                                      if: { $eq: ["$_id.month", 11] },
                                                      then: "Noviembre",
                                                      else: {
                                                        $cond: {
                                                          if: { $eq: ["$_id.month", 12] },
                                                          then: "Diciembre",
                                                          else: "Otros meses"
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
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
          averagePrice: 1,
          year: "$_id.year"
        }
      },
      {
        $sort: { year: 1, "_id.month": 1 }
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
        // Filtrar solo reservas que tienen servicios
        $match: {
          serviceIds: { $exists: true, $ne: [] }
        }
      },
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

  // 📊 NUEVO REPORTE: Estadísticas generales de reservas (sin filtros restrictivos)
  async getReservationsStats() {
    return this.reservationModel.aggregate([
      {
        // Contar todas las reservas agrupadas por estado
        $group: {
          _id: { $ifNull: ["$status", "sin-estado"] },
          totalReservations: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          averagePrice: { $avg: "$totalPrice" },
          averageGuests: { $avg: "$guestCount" }
        }
      },
      {
        $project: {
          status: "$_id",
          totalReservations: 1,
          totalRevenue: 1,
          averagePrice: { $round: ["$averagePrice", 2] },
          averageGuests: { $round: ["$averageGuests", 1] },
          _id: 0
        }
      },
      {
        $sort: { totalReservations: -1 }
      }
    ]);
  }

  // 📊 NUEVO REPORTE: Reservas por habitación (más simple que room-occupancy)
  async getReservationsByRoom() {
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
        $unwind: {
          path: "$room",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $group: {
          _id: {
            roomId: "$roomId",
            roomName: "$room.name",
            roomNumber: "$room.roomNumber"
          },
          totalReservations: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          averagePrice: { $avg: "$totalPrice" }
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
      },
      {
        $project: {
          roomId: "$_id.roomId",
          roomName: "$_id.roomName",
          roomNumber: "$_id.roomNumber",
          totalReservations: 1,
          totalRevenue: 1,
          averagePrice: { $round: ["$averagePrice", 2] },
          occupancyRate: 1,
          _id: 0
        }
      },
      {
        $sort: { totalReservations: -1 }
      }
    ]);
  }

  
  async generateAllReports() {
    console.log('🔄 Iniciando generación paralela de reportes...');
    const startTime = Date.now();

    try {
      
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


  async updateRoomAvailabilityConcurrently(roomIds: string[]) {
    console.log(`🔄 Actualizando disponibilidad de ${roomIds.length} habitaciones concurrentemente...`);
    
    const startTime = Date.now();
    
    try {
      
      const updatePromises = roomIds.map(async (roomId) => {
        
        const activeReservations = await this.reservationModel.countDocuments({
          roomId,
          status: { $in: ['confirmed', 'pending'] },
          checkInDate: { $lte: new Date() },
          checkOutDate: { $gte: new Date() }
        });

        
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

  
  async createReservationsConcurrently(reservationsData: any[]) {
    console.log(`🔄 Procesando ${reservationsData.length} reservaciones concurrentemente...`);
    
    const startTime = Date.now();
    const results: any[] = [];
    const errors: any[] = [];

    try {
      
      const batchSize = 5;
      const batches: any[][] = [];
      
      for (let i = 0; i < reservationsData.length; i += batchSize) {
        batches.push(reservationsData.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (reservationData: any) => {
          try {
            
            const isAvailable = await this.checkRoomAvailability(
              reservationData.roomId,
              new Date(reservationData.checkInDate),
              new Date(reservationData.checkOutDate)
            );

            if (!isAvailable) {
              throw new Error(`Habitación ${reservationData.roomId} no disponible`);
            }

            
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
