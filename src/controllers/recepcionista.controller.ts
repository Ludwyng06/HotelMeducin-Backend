import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ReservationsService } from '@services/reservations.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reservation, ReservationDocument } from '@models/reservations/reservation.schema';
import { RoomsService } from '@services/rooms.service';
import { UsersService } from '@services/users.service';
import { UserRolesService } from '@services/user-roles.service';

@Controller('recepcionista')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('recepcionista')
export class RecepcionistaController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly roomsService: RoomsService,
    private readonly usersService: UsersService,
    private readonly userRolesService: UserRolesService,
    @InjectModel(Reservation.name) private reservationModel: Model<ReservationDocument>,
  ) {}

  @Get('dashboard')
  async getDashboard(@Query('date') date?: string) {
    // Si se proporciona fecha, usar esa fecha; si no, usar hoy
    let targetDate: Date;
    if (date) {
      // Si viene como string YYYY-MM-DD, crear la fecha correctamente
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = date.split('-').map(Number);
        targetDate = new Date(year, month - 1, day);
      } else {
        targetDate = new Date(date);
      }
    } else {
      targetDate = new Date();
    }
    targetDate.setHours(0, 0, 0, 0);
    const tomorrow = new Date(targetDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Obtener reservas pendientes (todas las fechas - esto no cambia)
    const pendingReservations = await this.reservationsService.findPendingReservations(targetDate);
    
    // Obtener reservas con check-in en la fecha objetivo (para pendientes y canceladas)
    const targetDateCheckInReservations = await this.reservationModel
      .find({
        checkInDate: {
          $gte: targetDate,
          $lt: tomorrow
        }
      })
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate('roomId', 'name roomNumber')
      .exec();
    
    // Obtener reservas CONFIRMADAS ACTIVAS en la fecha objetivo (checkInDate <= fecha objetivo <= checkOutDate)
    // Si el check-out es la fecha objetivo, la habitación aún está ocupada ese día
    const targetDateActiveConfirmed = await this.reservationModel
      .find({
        status: { $in: ['confirmed', 'CONFIRMED'] },
        checkInDate: { $lte: targetDate },
        checkOutDate: { $gte: targetDate }
      })
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate('roomId', 'name roomNumber')
      .exec();
    
    // Contar por estado
    const todayPending = targetDateCheckInReservations.filter(r => 
      r.status === 'pending' || r.status === 'PENDING'
    ).length;
    
    const todayConfirmed = targetDateActiveConfirmed.length; // Reservas confirmadas ACTIVAS en la fecha objetivo
    
    const todayCancelled = targetDateCheckInReservations.filter(r => 
      r.status === 'cancelled' || r.status === 'CANCELLED'
    ).length;
    
    return {
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0], // Incluir la fecha en la respuesta
        pendingReservations: pendingReservations.length,
        todayReservations: targetDateCheckInReservations.length,
        todayPending,
        todayConfirmed,
        todayCancelled,
        reservations: pendingReservations.slice(0, 10) // Primeras 10 para el dashboard
      },
      message: 'Dashboard del recepcionista'
    };
  }

  @Get('cash-register')
  async getCashRegister(@Query('date') date?: string) {
    // Si no se proporciona fecha, usar hoy
    // Normalizar la fecha correctamente para evitar problemas de zona horaria
    let targetDate: Date;
    if (date) {
      // Si viene como string YYYY-MM-DD, crear la fecha correctamente
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Crear fecha en hora local (no UTC) para que coincida con cómo se guardan las fechas
        const [year, month, day] = date.split('-').map(Number);
        targetDate = new Date(year, month - 1, day);
      } else {
        targetDate = new Date(date);
      }
    } else {
      targetDate = new Date();
    }
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Obtener reservas confirmadas ACTIVAS en la fecha objetivo
    // Usar EXACTAMENTE la misma lógica que el dashboard para garantizar consistencia
    // Una reserva está activa si: checkInDate <= fecha objetivo <= checkOutDate
    // Si el check-out es el día objetivo, la habitación aún está ocupada ese día
    
    // Primero obtener todas las reservas confirmadas para debug
    const allConfirmed = await this.reservationModel
      .find({ status: { $in: ['confirmed', 'CONFIRMED'] } })
      .select('checkInDate checkOutDate totalPrice paymentMethod')
      .lean()
      .exec();
    
    console.log(`💰 [Cash Register] Fecha objetivo: ${targetDate.toISOString()} (${targetDate.toLocaleDateString('es-CO')})`);
    console.log(`💰 [Cash Register] Total reservas confirmadas en BD: ${allConfirmed.length}`);
    allConfirmed.forEach((res, idx) => {
      console.log(`💰 [Cash Register] Reserva ${idx + 1}: checkIn=${res.checkInDate?.toISOString()}, checkOut=${res.checkOutDate?.toISOString()}, price=${res.totalPrice}, method=${res.paymentMethod}`);
    });
    
    const confirmedReservations = await this.reservationModel
      .find({
        status: { $in: ['confirmed', 'CONFIRMED'] },
        checkInDate: { $lte: targetDate },
        checkOutDate: { $gte: targetDate }
      })
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate('roomId', 'name roomNumber')
      .populate('confirmedBy', 'firstName lastName email')
      .exec();
    
    console.log(`💰 [Cash Register] Reservas confirmadas ACTIVAS encontradas: ${confirmedReservations.length}`);
    
    // Calcular totales por método de pago (solo efectivo y transferencia)
    const totalsByMethod = {
      efectivo: {
        count: 0,
        total: 0,
        reservations: [] as any[]
      },
      transferencia: {
        count: 0,
        total: 0,
        reservations: [] as any[]
      }
    };
    
    let grandTotal = 0;
    
    console.log(`💰 [Cash Register] Procesando ${confirmedReservations.length} reservas confirmadas...`);
    confirmedReservations.forEach((reservation, idx) => {
      const method = (reservation.paymentMethod || 'efectivo').toLowerCase();
      const price = reservation.totalPrice || 0;
      
      console.log(`💰 [Cash Register] Reserva ${idx + 1}: method=${method}, price=${price}, checkIn=${reservation.checkInDate?.toISOString()}, checkOut=${reservation.checkOutDate?.toISOString()}`);
      
      // Solo procesar efectivo o transferencia, ignorar cualquier otro valor
      if (method === 'efectivo') {
        totalsByMethod.efectivo.count++;
        totalsByMethod.efectivo.total += price;
        totalsByMethod.efectivo.reservations.push(reservation);
        grandTotal += price;
      } else if (method === 'transferencia') {
        totalsByMethod.transferencia.count++;
        totalsByMethod.transferencia.total += price;
        totalsByMethod.transferencia.reservations.push(reservation);
        grandTotal += price;
      } else {
        console.warn(`💰 [Cash Register] Método de pago desconocido: ${method}, usando efectivo por defecto`);
        totalsByMethod.efectivo.count++;
        totalsByMethod.efectivo.total += price;
        totalsByMethod.efectivo.reservations.push(reservation);
        grandTotal += price;
      }
    });
    
    console.log(`💰 [Cash Register] Total calculado: $${grandTotal}, Efectivo: ${totalsByMethod.efectivo.count} ($${totalsByMethod.efectivo.total}), Transferencia: ${totalsByMethod.transferencia.count} ($${totalsByMethod.transferencia.total})`);
    
    // Obtener reservas canceladas del día (para reembolsos)
    // IMPORTANTE: Solo contar reembolsos de reservas que fueron CONFIRMADAS antes de cancelarse
    // Las reservas pendientes canceladas nunca recibieron pago, por lo que no generan reembolso
    const cancelledReservations = await this.reservationModel
      .find({
        status: { $in: ['cancelled', 'CANCELLED'] },
        cancelledAt: {
          $gte: targetDate,
          $lt: nextDay
        },
        // Solo reservas que fueron confirmadas antes de cancelarse (tienen confirmedAt)
        confirmedAt: { $exists: true, $ne: null }
      })
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate('roomId', 'name roomNumber')
      .exec();
    
    // Solo sumar reembolsos de reservas que fueron confirmadas (recibieron pago)
    const refundsTotal = cancelledReservations.reduce((sum, res) => 
      sum + (res.totalPrice || 0), 0
    );
    
    return {
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        summary: {
          totalReservations: confirmedReservations.length,
          grandTotal,
          refundsTotal,
          netTotal: grandTotal - refundsTotal
        },
        byPaymentMethod: totalsByMethod,
        cancelledReservations: cancelledReservations.map(r => ({
          _id: r._id,
          room: r.roomId,
          guest: r.userId,
          checkInDate: r.checkInDate,
          checkOutDate: r.checkOutDate,
          totalPrice: r.totalPrice,
          cancelledAt: r.cancelledAt,
          cancellationReason: r.cancellationReason
        })),
        confirmedReservations: confirmedReservations.map(r => ({
          _id: r._id,
          room: r.roomId,
          guest: r.userId,
          checkInDate: r.checkInDate,
          checkOutDate: r.checkOutDate,
          totalPrice: r.totalPrice,
          paymentMethod: r.paymentMethod,
          paymentNotes: r.paymentNotes,
          confirmedBy: r.confirmedBy,
          confirmedAt: r.confirmedAt
        }))
      },
      message: 'Cierre de caja generado correctamente'
    };
  }

  @Get('reservations/pending')
  async getPendingReservations() {
    const reservations = await this.reservationsService.findPendingReservations();
    return {
      success: true,
      data: reservations,
      message: 'Reservas pendientes obtenidas exitosamente'
    };
  }

  @Get('rooms/with-reservations')
  async getRoomsWithReservations() {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Obtener todas las habitaciones
    const rooms = await this.roomsService.findAll();
    
    // Buscar reservas ACTIVAS (ocupadas ahora) o pendientes que empiezan hoy
    // Una reserva está activa si: checkInDate <= ahora AND checkOutDate > ahora
    const activeReservations = await this.reservationModel
      .find({
        $or: [
          // Reservas activas (ocupadas ahora)
          {
            status: 'confirmed',
            checkInDate: { $lte: now },
            checkOutDate: { $gt: now }
          },
          // Reservas pendientes que empiezan hoy o están activas
          {
            status: 'pending',
            $or: [
              { checkInDate: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } },
              { checkInDate: { $lte: now }, checkOutDate: { $gt: now } }
            ]
          }
        ]
      })
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate('roomId')
      .exec();

    // Crear un mapa de reservas por habitación
    const reservationsByRoom = new Map();
    activeReservations.forEach(reservation => {
      const roomId = reservation.roomId?._id?.toString() || reservation.roomId?.toString();
      if (roomId) {
        if (!reservationsByRoom.has(roomId)) {
          reservationsByRoom.set(roomId, []);
        }
        reservationsByRoom.get(roomId).push(reservation);
      }
    });

    // Agregar información de reserva a cada habitación
    const roomsWithReservations = rooms.map(room => {
      const roomId = room._id.toString();
      const reservations = reservationsByRoom.get(roomId) || [];
      
      // Separar reservas pendientes y confirmadas
      const pendingReservations = reservations.filter((r: any) => r.status === 'pending');
      const confirmedReservations = reservations.filter((r: any) => r.status === 'confirmed');
      
      // Prioridad: maintenance > occupied (confirmada activa) > pending > available
      let status = 'available';
      let reservationInfo: any = null;
      let timeUntilExpiration: any = null;

      if (room.isMaintenance) {
        status = 'maintenance';
      } else if (confirmedReservations.length > 0) {
        // Si hay una reserva confirmada activa, la habitación está ocupada
        status = 'occupied';
        reservationInfo = {
          _id: confirmedReservations[0]._id,
          userId: confirmedReservations[0].userId,
          checkInDate: confirmedReservations[0].checkInDate,
          checkOutDate: confirmedReservations[0].checkOutDate,
          totalPrice: confirmedReservations[0].totalPrice,
          status: confirmedReservations[0].status
        };
        // NO establecer timeUntilExpiration para reservas confirmadas
        timeUntilExpiration = null;
      } else if (pendingReservations.length > 0) {
        // Si hay reservas pendientes pero no confirmadas activas
        const pendingReservation = pendingReservations[0];
        status = 'pending';
        
        const createdAt = new Date((pendingReservation as any).createdAt || pendingReservation.checkInDate);
        const expirationTime = new Date(createdAt.getTime() + 60 * 60 * 1000); // 1 hora después de creación
        const timeRemaining = expirationTime.getTime() - now.getTime();
        
        if (timeRemaining > 0) {
          const minutes = Math.floor(timeRemaining / 60000);
          const seconds = Math.floor((timeRemaining % 60000) / 1000);
          timeUntilExpiration = { minutes, seconds, total: timeRemaining };
        } else {
          status = 'expired';
        }

        reservationInfo = {
          _id: pendingReservation._id,
          userId: pendingReservation.userId,
          checkInDate: pendingReservation.checkInDate,
          checkOutDate: pendingReservation.checkOutDate,
          totalPrice: pendingReservation.totalPrice,
          status: pendingReservation.status,
          createdAt: (pendingReservation as any).createdAt
        };
      }

      // Convertir room a objeto plano
      const roomObject = JSON.parse(JSON.stringify(room));

      return {
        ...roomObject,
        currentStatus: status,
        pendingReservation: reservationInfo,
        timeUntilExpiration
      };
    });

    // Agrupar por categoría
    const roomsByCategory = new Map();
    roomsWithReservations.forEach(room => {
      const categoryName = room.categoryId?.name || 'Sin Categoría';
      if (!roomsByCategory.has(categoryName)) {
        roomsByCategory.set(categoryName, {
          category: room.categoryId,
          rooms: []
        });
      }
      roomsByCategory.get(categoryName).rooms.push(room);
    });

    // Convertir a array y ordenar
    const groupedRooms = Array.from(roomsByCategory.entries()).map(([categoryName, data]) => ({
      categoryName,
      category: data.category,
      rooms: data.rooms.sort((a: any, b: any) => {
        // Ordenar por número de habitación
        return parseInt(a.roomNumber) - parseInt(b.roomNumber);
      })
    }));

    return {
      success: true,
      data: groupedRooms,
      message: 'Habitaciones con reservas obtenidas exitosamente'
    };
  }

  @Patch('reservations/:id/confirm')
  async confirmReservation(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { paymentMethod?: string; notes?: string }
  ) {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    const reservation = await this.reservationsService.confirmReservation(
      id,
      userId.toString(),
      body
    );
    
    return {
      success: true,
      data: reservation,
      message: 'Reserva confirmada exitosamente'
    };
  }

  @Patch('reservations/:id/cancel')
  async cancelReservation(
    @Param('id') id: string,
    @Body() body: { reason?: string }
  ) {
    const reservation = await this.reservationsService.findOne(id);
    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }
    
    // El recepcionista puede cancelar cualquier reserva pendiente
    if (reservation.status !== 'pending') {
      throw new BadRequestException('Solo se pueden cancelar reservas pendientes');
    }
    
    // Actualizar la reserva usando findByIdAndUpdate
    const cancelledReservation = await this.reservationModel
      .findByIdAndUpdate(
        id,
        {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: body.reason || 'Cancelada por recepcionista'
        },
        { new: true }
      )
      .populate('userId')
      .populate('roomId')
      .exec();
    
    if (!cancelledReservation) {
      throw new NotFoundException('Reserva no encontrada');
    }
    
    return {
      success: true,
      data: cancelledReservation,
      message: 'Reserva cancelada exitosamente'
    };
  }

  @Get('clients/search')
  async searchClientByEmail(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email es requerido');
    }

    // Buscar cliente y poblar documentType si existe
    const client = await this.usersService.findByEmail(email, false);
    
    if (!client) {
      return {
        success: false,
        data: null,
        message: 'Usuario no encontrado'
      };
    }

    // Obtener documentType si existe
    let documentTypeId = '';
    if (client.documentType) {
      // Si es un ObjectId, convertirlo a string
      if (typeof client.documentType === 'object' && (client.documentType as any)._id) {
        documentTypeId = (client.documentType as any)._id.toString();
      } else {
        documentTypeId = client.documentType.toString();
      }
    }

    // Formatear birthDate si existe
    let birthDateString = '';
    if (client.birthDate) {
      const birthDate = client.birthDate instanceof Date ? client.birthDate : new Date(client.birthDate);
      birthDateString = birthDate.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Devolver solo los campos relevantes para autocompletar
    return {
      success: true,
      data: {
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phoneNumber: client.phoneNumber || '',
        // Si el usuario tiene documento registrado, también incluirlo
        documentType: documentTypeId,
        documentNumber: client.documentNumber || '',
        nationality: client.nationality || '',
        birthDate: birthDateString
      },
      message: 'Usuario encontrado'
    };
  }

  @Post('clients/find-or-create')
  async findOrCreateClient(@Body() clientData: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    documentType?: string;
    documentNumber?: string;
    nationality?: string;
    birthDate?: string;
  }) {
    if (!clientData.email || !clientData.firstName || !clientData.lastName) {
      throw new BadRequestException('Email, nombre y apellido son requeridos');
    }

    // Buscar cliente existente por email
    let client = await this.usersService.findByEmail(clientData.email, false);
    
    // Si no existe por email pero hay teléfono, buscar por teléfono también
    // Esto maneja el caso donde el mismo teléfono puede estar asociado al mismo email
    if (!client && clientData.phoneNumber) {
      const userWithPhone = await this.usersService.findByPhone(clientData.phoneNumber);
      // Si el teléfono pertenece al mismo email, usar ese usuario
      if (userWithPhone && userWithPhone.email === clientData.email) {
        client = userWithPhone;
        console.log('✅ Cliente encontrado por teléfono con mismo email:', client.email);
      } else if (userWithPhone && userWithPhone.email !== clientData.email) {
        // El teléfono pertenece a otro usuario con diferente email
        throw new ConflictException(
          `El teléfono ${clientData.phoneNumber} ya está registrado para otro cliente (${userWithPhone.email}). Por favor, use un teléfono diferente o verifique el email del cliente.`
        );
      }
    }
    
    if (!client) {
      // Crear nuevo usuario cliente
      const defaultRole = await this.userRolesService.findByName('user');
      if (!defaultRole) {
        throw new BadRequestException('Rol de usuario no encontrado');
      }

      // Solo crear si no se encontró un cliente existente
      if (!client) {
        try {
          client = await this.usersService.create({
            email: clientData.email,
            firstName: clientData.firstName,
            lastName: clientData.lastName,
            phoneNumber: clientData.phoneNumber,
            documentType: clientData.documentType ? new Types.ObjectId(clientData.documentType) : undefined,
            documentNumber: clientData.documentNumber,
            nationality: clientData.nationality,
            birthDate: clientData.birthDate ? new Date(clientData.birthDate) : undefined,
            roleId: defaultRole._id,
            password: undefined, // Sin contraseña, solo para reservas
            authProvider: 'local'
          } as any);
          console.log('✅ Cliente creado automáticamente:', client.email);
        } catch (error: any) {
          // Si falla por duplicado (email o teléfono), intentar buscar de nuevo
          if (error.code === 11000 || error instanceof ConflictException) {
            // Buscar por email primero
            client = await this.usersService.findByEmail(clientData.email, false);
            // Si no se encuentra por email, buscar por teléfono
            if (!client && clientData.phoneNumber) {
              const userWithPhone = await this.usersService.findByPhone(clientData.phoneNumber);
              if (userWithPhone && userWithPhone.email === clientData.email) {
                client = userWithPhone;
              }
            }
            // Si aún no se encuentra, re-lanzar el error original
            if (!client) {
              throw error;
            }
          } else {
            throw error;
          }
        }
      }
    } else {
      // Actualizar datos adicionales si se proporcionan y no existen
      const updates: any = {};
      
      if (clientData.phoneNumber && !client.phoneNumber) {
        updates.phoneNumber = clientData.phoneNumber;
      }
      if (clientData.documentType && !client.documentType) {
        updates.documentType = new Types.ObjectId(clientData.documentType);
      }
      if (clientData.documentNumber && !client.documentNumber) {
        updates.documentNumber = clientData.documentNumber;
      }
      if (clientData.nationality && !client.nationality) {
        updates.nationality = clientData.nationality;
      }
      if (clientData.birthDate && !client.birthDate) {
        updates.birthDate = new Date(clientData.birthDate);
      }
      
      // Actualizar solo si hay cambios
      if (Object.keys(updates).length > 0) {
        client = await this.usersService.update(client._id.toString(), updates);
        if (client) {
          console.log('✅ Datos adicionales del cliente actualizados:', client.email);
        } else {
          console.log('⚠️ Datos adicionales del cliente actualizados, pero no se pudo obtener el cliente actualizado');
        }
      } else {
        console.log('✅ Cliente encontrado:', client.email);
      }
    }
    
    return {
      success: true,
      data: client,
      message: client ? 'Cliente encontrado' : 'Cliente creado'
    };
  }

  @Get('clients/check-phone')
  async checkClientPhone(
    @Query('phoneNumber') phoneNumber: string,
    @Query('email') email?: string,
  ) {
    if (!phoneNumber) {
      throw new BadRequestException('phoneNumber es requerido');
    }

    // Buscar usuario por teléfono
    const userWithPhone = await this.usersService.findByPhone(phoneNumber);

    // Si no hay nadie con ese teléfono, es válido
    if (!userWithPhone) {
      return {
        exists: false,
        message: null,
      };
    }

    // Si el teléfono pertenece al mismo email que se está usando, no es conflicto
    if (email && userWithPhone.email === email) {
      return {
        exists: false,
        message: null,
      };
    }

    // Teléfono ya usado por otro usuario
    return {
      exists: true,
      message: `El teléfono ${phoneNumber} ya está registrado en el sistema para otro cliente`,
    };
  }
}

