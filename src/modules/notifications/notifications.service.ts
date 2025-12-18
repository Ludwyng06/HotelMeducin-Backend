import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationsGateway } from './notifications.gateway';
import { Notification, NotificationDocument } from '@models/notifications/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  // Crear y enviar notificación
  async createAndSendNotification(data: {
    userId?: string;
    role?: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    try {
      // Crear notificación en la base de datos
      const notification = new this.notificationModel({
        userId: data.userId,
        role: data.role,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        read: false,
        createdAt: new Date(),
      });

      await notification.save();

      // Enviar notificación en tiempo real
      const notificationPayload = {
        id: notification._id.toString(),
        userId: data.userId,
        role: data.role,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        read: false,
        createdAt: notification.createdAt,
      };

      if (data.userId) {
        // Enviar a usuario específico
        this.notificationsGateway.sendToUser(data.userId, notificationPayload);
      } else if (data.role) {
        // Enviar a todos los usuarios de un rol
        this.notificationsGateway.sendToRole(data.role, notificationPayload);
      } else {
        // Broadcast a todos
        this.notificationsGateway.broadcast(notificationPayload);
      }

      return notification;
    } catch (error) {
      console.error('Error al crear y enviar notificación:', error);
      throw error;
    }
  }

  // Notificar nueva reservación a administradores
  async notifyNewReservation(reservation: any) {
    return this.createAndSendNotification({
      role: 'admin',
      type: 'reservation',
      title: 'Nueva Reservación',
      message: `Se ha creado una nueva reservación: ${reservation._id}`,
      data: {
        reservationId: reservation._id,
        checkInDate: reservation.checkInDate,
        checkOutDate: reservation.checkOutDate,
        totalPrice: reservation.totalPrice,
      },
    });
  }

  // Notificar actualización de disponibilidad de habitación
  async notifyRoomAvailabilityUpdate(room: any) {
    return this.createAndSendNotification({
      type: 'room-availability',
      title: 'Actualización de Habitación',
      message: `La habitación ${room.name} ha cambiado su disponibilidad`,
      data: {
        roomId: room._id,
        roomName: room.name,
        isAvailable: room.isAvailable,
      },
    });
  }

  // Notificar cancelación de reservación
  async notifyReservationCancellation(reservationId: string, userId: string) {
    return this.createAndSendNotification({
      userId,
      type: 'reservation-cancelled',
      title: 'Reservación Cancelada',
      message: `Tu reservación ${reservationId} ha sido cancelada`,
      data: {
        reservationId,
      },
    });
  }

  // Obtener notificaciones de un usuario
  async getUserNotifications(userId: string, limit: number = 50) {
    return this.notificationModel
      .find({
        $or: [{ userId }, { role: { $exists: false } }, { userId: { $exists: false } }],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  // Marcar notificación como leída
  async markAsRead(notificationId: string, userId: string) {
    return this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true, readAt: new Date() },
      { new: true },
    );
  }

  // Marcar todas las notificaciones como leídas
  async markAllAsRead(userId: string) {
    return this.notificationModel.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() },
    );
  }

  // Obtener número de notificaciones no leídas
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId, read: false });
  }
}

