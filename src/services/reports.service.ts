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
import { TemporalUtils } from '@common/utils/temporal.utils';
import { Temporal } from '@js-temporal/polyfill';

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

    // Usar Temporal para calcular fechas
    const today = TemporalUtils.today();
    const thirtyDaysAgo = TemporalUtils.plainDateToDate(TemporalUtils.addDays(today, -30));
    const sevenDaysAgo = TemporalUtils.plainDateToDate(TemporalUtils.addDays(today, -7));
    
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
    // Usar Temporal API para obtener fecha de hoy
    // Esto garantiza consistencia con Neo4j que también usa la misma lógica
    const today = TemporalUtils.today();
    const todayDateOnly = TemporalUtils.formatDate(today); // YYYY-MM-DD
    
    // Crear rango para el día completo (igual que Neo4j calcula)
    const tomorrow = TemporalUtils.addDays(today, 1);
    const todayStart = TemporalUtils.plainDateToDate(today).toISOString(); // 2025-12-14T00:00:00.000Z
    const tomorrowStart = TemporalUtils.plainDateToDate(tomorrow).toISOString(); // 2025-12-15T00:00:00.000Z

    console.log(`📅 [getReservationsToday] Filtrando reservaciones del día: ${todayDateOnly}`);
    console.log(`📅 [getReservationsToday] Rango: ${todayStart} a ${tomorrowStart}`);
    console.log(`📅 [getReservationsToday] Fecha legible: ${TemporalUtils.formatDateLocalized(today)}`);

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
        checkInDate: r.checkInDate instanceof Date 
          ? TemporalUtils.formatDate(TemporalUtils.dateToPlainDate(r.checkInDate))
          : r.checkInDate instanceof Temporal.PlainDate
          ? TemporalUtils.formatDate(r.checkInDate)
          : r.checkInDate,
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
        checkInDate: r.checkInDate instanceof Date 
          ? TemporalUtils.formatDate(TemporalUtils.dateToPlainDate(r.checkInDate))
          : r.checkInDate instanceof Temporal.PlainDate
          ? TemporalUtils.formatDate(r.checkInDate)
          : r.checkInDate,
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
    const startTime = Temporal.Now.instant().epochMilliseconds;

    try {
      
      const [
        activeUsers,
        monthlyReservations,
        roomOccupancy,
        popularServices
      ] = await Promise.all([
        this.getActiveUsers(),
        this.getReservationsMonthly(
          TemporalUtils.plainDateToDate(TemporalUtils.addDays(TemporalUtils.today(), -30)),
          TemporalUtils.plainDateToDate(TemporalUtils.today())
        ),
        this.getRoomOccupancy(),
        this.getPopularServices()
      ]);

      const endTime = Temporal.Now.instant().epochMilliseconds;
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
        timestamp: TemporalUtils.now().toInstant().toString()
      };
    } catch (error) {
      console.error('❌ Error en generación paralela de reportes:', error);
      throw error;
    }
  }


  async updateRoomAvailabilityConcurrently(roomIds: string[]) {
    console.log(`🔄 Actualizando disponibilidad de ${roomIds.length} habitaciones concurrentemente...`);
    
    const startTime = Temporal.Now.instant().epochMilliseconds;
    
    try {
      
      const updatePromises = roomIds.map(async (roomId) => {
        
        const today = TemporalUtils.plainDateToDate(TemporalUtils.today());
        const activeReservations = await this.reservationModel.countDocuments({
          roomId,
          status: { $in: ['confirmed', 'pending'] },
          checkInDate: { $lte: today },
          checkOutDate: { $gte: today }
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
    
    const startTime = Temporal.Now.instant().epochMilliseconds;
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
            
            // Convertir fechas a Date para checkRoomAvailability (acepta Date)
            const checkInValue = reservationData.checkInDate as any;
            const checkIn = checkInValue instanceof Date
              ? checkInValue
              : checkInValue instanceof Temporal.PlainDate
              ? TemporalUtils.plainDateToDate(checkInValue)
              : TemporalUtils.plainDateToDate(TemporalUtils.parsePlainDate(String(checkInValue)));
            
            const checkOutValue = reservationData.checkOutDate as any;
            const checkOut = checkOutValue instanceof Date
              ? checkOutValue
              : checkOutValue instanceof Temporal.PlainDate
              ? TemporalUtils.plainDateToDate(checkOutValue)
              : TemporalUtils.plainDateToDate(TemporalUtils.parsePlainDate(String(checkOutValue)));
            
            const isAvailable = await this.checkRoomAvailability(
              reservationData.roomId,
              checkIn,
              checkOut
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
