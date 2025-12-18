import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedClients: Map<string, { userId: string; role: string }> = new Map();

  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extraer token del handshake
      const token = this.extractTokenFromSocket(client);
      
      if (!token) {
        this.logger.warn(`Cliente ${client.id} intentó conectarse sin token`);
        client.disconnect();
        return;
      }

      // Verificar token JWT
      const payload = await this.jwtService.verifyAsync(token);
      
      // Almacenar información del cliente
      this.connectedClients.set(client.id, {
        userId: payload.sub || payload.id,
        role: payload.role || 'user',
      });

      // Unir al cliente a una sala basada en su rol
      const room = `role:${payload.role || 'user'}`;
      client.join(room);
      
      // Unir también a una sala personal del usuario
      const userRoom = `user:${payload.sub || payload.id}`;
      client.join(userRoom);

      this.logger.log(`Cliente ${client.id} conectado - Usuario: ${payload.sub || payload.id}, Rol: ${payload.role || 'user'}`);

      // Enviar notificación de bienvenida
      client.emit('connected', {
        message: 'Conectado al sistema de notificaciones',
        userId: payload.sub || payload.id,
        role: payload.role || 'user',
      });
    } catch (error) {
      this.logger.error(`Error al autenticar cliente ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      this.logger.log(`Cliente ${client.id} desconectado - Usuario: ${clientInfo.userId}`);
      this.connectedClients.delete(client.id);
    }
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { room: string }) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      client.join(data.room);
      this.logger.log(`Cliente ${client.id} se unió a la sala: ${data.room}`);
      client.emit('joined-room', { room: data.room });
    }
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { room: string }) {
    client.leave(data.room);
    this.logger.log(`Cliente ${client.id} salió de la sala: ${data.room}`);
    client.emit('left-room', { room: data.room });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  // Método para enviar notificación a un usuario específico
  sendToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  // Método para enviar notificación a todos los usuarios de un rol
  sendToRole(role: string, notification: any) {
    this.server.to(`role:${role}`).emit('notification', notification);
  }

  // Método para enviar notificación a todos los clientes conectados
  broadcast(notification: any) {
    this.server.emit('notification', notification);
  }

  // Método para obtener número de clientes conectados
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Método auxiliar para extraer token del socket
  private extractTokenFromSocket(client: Socket): string | null {
    // Intentar obtener el token del handshake auth
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization;
    
    if (token) {
      // Si viene como "Bearer token", extraer solo el token
      return token.startsWith('Bearer ') ? token.substring(7) : token;
    }
    
    return null;
  }
}

