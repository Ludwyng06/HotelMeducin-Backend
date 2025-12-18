import { Controller, Get, Post, Delete, Body, Param, UseGuards, Query, Request } from '@nestjs/common';
import { Neo4jService } from '@services/neo4j.service';
import { CreateNodeDto } from '@models/neo4j/dto/create-node.dto';
import { CreateRelationshipDto } from '@models/neo4j/dto/create-relationship.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';
import { UsersService } from '@services/users.service';
import { RoomsService } from '@services/rooms.service';
import { ReservationsService } from '@services/reservations.service';
import { TemporalUtils } from '@common/utils/temporal.utils';
import { Temporal } from '@js-temporal/polyfill';

@Controller('neo4j')
export class Neo4jController {
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly usersService: UsersService,
    private readonly roomsService: RoomsService,
    private readonly reservationsService: ReservationsService,
  ) {}

  // 🔷 ENDPOINTS PARA NODOS

  @Post('nodes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async createNode(@Body() createNodeDto: CreateNodeDto) {
    const node = await this.neo4jService.createNode(
      createNodeDto.label,
      createNodeDto.properties || {},
    );
    return {
      success: true,
      data: node,
      message: 'Nodo creado exitosamente',
    };
  }

  @Get('nodes/:label')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async findAllNodes(@Param('label') label: string) {
    const nodes = await this.neo4jService.findAllNodes(label);
    return {
      success: true,
      data: nodes,
      message: `Nodos de tipo ${label} obtenidos exitosamente`,
    };
  }

  @Get('nodes/:label/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async findNodeById(@Param('label') label: string, @Param('id') id: string) {
    const node = await this.neo4jService.findNodeById(label, id);
    if (!node) {
      return {
        success: false,
        message: 'Nodo no encontrado',
      };
    }
    return {
      success: true,
      data: node,
      message: 'Nodo obtenido exitosamente',
    };
  }

  @Post('nodes/:label/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async updateNode(
    @Param('label') label: string,
    @Param('id') id: string,
    @Body() properties: Record<string, any>,
  ) {
    const node = await this.neo4jService.updateNode(label, id, properties);
    return {
      success: true,
      data: node,
      message: 'Nodo actualizado exitosamente',
    };
  }

  @Delete('nodes/:label/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async deleteNode(@Param('label') label: string, @Param('id') id: string) {
    const deleted = await this.neo4jService.deleteNode(label, id);
    return {
      success: deleted,
      message: deleted ? 'Nodo eliminado exitosamente' : 'Nodo no encontrado',
    };
  }

  // 🔗 ENDPOINTS PARA RELACIONES

  @Post('relationships')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async createRelationship(@Body() createRelationshipDto: CreateRelationshipDto) {
    const relationship = await this.neo4jService.createRelationship(
      createRelationshipDto.fromLabel,
      createRelationshipDto.fromId,
      createRelationshipDto.relationshipType,
      createRelationshipDto.toLabel,
      createRelationshipDto.toId,
      createRelationshipDto.properties,
    );
    return {
      success: true,
      data: relationship,
      message: 'Relación creada exitosamente',
    };
  }

  @Delete('relationships')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async deleteRelationship(@Body() createRelationshipDto: CreateRelationshipDto) {
    const deleted = await this.neo4jService.deleteRelationship(
      createRelationshipDto.fromLabel,
      createRelationshipDto.fromId,
      createRelationshipDto.relationshipType,
      createRelationshipDto.toLabel,
      createRelationshipDto.toId,
    );
    return {
      success: deleted,
      message: deleted ? 'Relación eliminada exitosamente' : 'Relación no encontrada',
    };
  }

  @Get('nodes/:label/:id/relationships')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async getNodeRelationships(@Param('label') label: string, @Param('id') id: string) {
    const relationships = await this.neo4jService.getNodeRelationships(label, id);
    return {
      success: true,
      data: relationships,
      message: 'Relaciones obtenidas exitosamente',
    };
  }

  // 📊 ENDPOINTS PARA GRAFOS

  @Get('graph')
  @Public()
  async getFullGraph() {
    const graph = await this.neo4jService.getFullGraph();
    return {
      success: true,
      data: graph,
      message: 'Grafo obtenido exitosamente',
      metadata: graph.metadata || {}
    };
  }

  // 🔄 ENDPOINTS PARA SINCRONIZACIÓN

  @Post('sync/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async syncUsers(@Body() body: { users: any[] }) {
    await this.neo4jService.syncUsersFromMongo(body.users);
    return {
      success: true,
      message: 'Usuarios sincronizados exitosamente',
    };
  }

  @Post('sync/rooms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async syncRooms(@Body() body: { rooms: any[] }) {
    await this.neo4jService.syncRoomsFromMongo(body.rooms);
    return {
      success: true,
      message: 'Habitaciones sincronizadas exitosamente',
    };
  }

  @Post('sync/reservations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async syncReservations(@Body() body: { reservations: any[] }) {
    await this.neo4jService.syncReservationsFromMongo(body.reservations);
    return {
      success: true,
      message: 'Reservaciones sincronizadas exitosamente',
    };
  }

  @Post('sync/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async syncAll(
    @Body() body: {
      users?: any[];
      rooms?: any[];
      reservations?: any[];
    },
  ) {
    const results: string[] = [];
    
    if (body.users && body.users.length > 0) {
      await this.neo4jService.syncUsersFromMongo(body.users);
      results.push(`${body.users.length} usuarios`);
    }
    
    if (body.rooms && body.rooms.length > 0) {
      await this.neo4jService.syncRoomsFromMongo(body.rooms);
      results.push(`${body.rooms.length} habitaciones`);
    }
    
    if (body.reservations && body.reservations.length > 0) {
      await this.neo4jService.syncReservationsFromMongo(body.reservations);
      results.push(`${body.reservations.length} reservaciones`);
    }

    return {
      success: true,
      message: `Sincronización completa: ${results.join(', ')}`,
    };
  }

  @Post('sync/auto')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  async syncAuto() {
    console.log('🔄 [SYNC-AUTO] Iniciando sincronización automática completa...');
    
    // Obtener datos de MongoDB y sincronizar automáticamente
    const [users, rooms, reservations] = await Promise.all([
      this.usersService.findAll(),
      this.roomsService.findAll(),
      this.reservationsService.findAll(),
    ]);

    console.log('🔄 [SYNC-AUTO] Datos obtenidos:', {
      users: users.length,
      rooms: rooms.length,
      reservations: reservations.length
    });

    // Sincronizar usuarios primero
    console.log('🔄 [SYNC-AUTO] Sincronizando usuarios...');
    await this.neo4jService.syncUsersFromMongo(users);
    console.log('✅ [SYNC-AUTO] Usuarios sincronizados');

    // Sincronizar habitaciones
    console.log('🔄 [SYNC-AUTO] Sincronizando habitaciones...');
    await this.neo4jService.syncRoomsFromMongo(rooms);
    console.log('✅ [SYNC-AUTO] Habitaciones sincronizadas');

    // Sincronizar reservaciones (necesitan estar pobladas con userId y roomId)
    console.log('🔄 [SYNC-AUTO] Sincronizando reservaciones...');
    console.log('🔄 [SYNC-AUTO] Total de reservaciones a sincronizar:', reservations.length);
    
    // Obtener reservaciones con datos poblados para sincronización correcta
    const reservationsForSync = reservations.map((res: any) => {
      // Convertir a objeto plano si es un documento de Mongoose
      const reservation = res.toObject ? res.toObject() : JSON.parse(JSON.stringify(res));
      
      // Extraer IDs correctamente
      const userId = reservation.userId?._id?.toString() || 
                    reservation.userId?.id?.toString() || 
                    (reservation.userId && typeof reservation.userId === 'object' ? reservation.userId.toString() : reservation.userId) ||
                    reservation.userId;
      
      const roomId = reservation.roomId?._id?.toString() || 
                    reservation.roomId?.id?.toString() || 
                    (reservation.roomId && typeof reservation.roomId === 'object' ? reservation.roomId.toString() : reservation.roomId) ||
                    reservation.roomId;
      
      console.log('🔄 [SYNC-AUTO] Procesando reservación:', {
        reservationId: reservation._id?.toString(),
        userId: userId,
        roomId: roomId,
        status: reservation.status, // Log del status
        hasUserId: !!userId,
        hasRoomId: !!roomId
      });
      
      return {
        ...reservation,
        _id: reservation._id?.toString() || reservation._id,
        userId: userId,
        roomId: roomId
      };
    });
    
    console.log('🔄 [SYNC-AUTO] Reservaciones normalizadas:', reservationsForSync.length);
    await this.neo4jService.syncReservationsFromMongo(reservationsForSync);
    console.log('✅ [SYNC-AUTO] Reservaciones sincronizadas');

    return {
      success: true,
      message: `Sincronización automática completada: ${users.length} usuarios, ${rooms.length} habitaciones, ${reservations.length} reservaciones`,
      data: {
        users: users.length,
        rooms: rooms.length,
        reservations: reservations.length,
      },
    };
  }

  @Post('sync/reservations-today')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'admin')
  async syncTodayReservations() {
    console.log('🔄 [SYNC-TODAY] Iniciando sincronización de reservaciones del día actual...');
    
    // Obtener fecha de hoy usando Temporal
    const today = TemporalUtils.today();
    const todayStart = TemporalUtils.plainDateToDate(today).toISOString();
    const tomorrow = TemporalUtils.addDays(today, 1);
    const tomorrowStart = TemporalUtils.plainDateToDate(tomorrow).toISOString();
    
    console.log(`🔄 [SYNC-TODAY] Buscando reservaciones entre ${todayStart} y ${tomorrowStart}`);
    
    // Obtener reservaciones del día actual con datos poblados
    const reservations = await this.reservationsService.findAll();
    const todayReservations = reservations.filter((res: any) => {
      // Convertir checkInDate a string ISO para comparación
      let checkInDateStr: string;
      if (res.checkInDate instanceof Date) {
        checkInDateStr = res.checkInDate.toISOString();
      } else if (res.checkInDate instanceof Temporal.PlainDate) {
        checkInDateStr = TemporalUtils.plainDateToDate(res.checkInDate).toISOString();
      } else {
        checkInDateStr = String(res.checkInDate);
      }
      // Comparar strings ISO directamente
      return checkInDateStr >= todayStart && checkInDateStr < tomorrowStart;
    });
    
    console.log(`🔄 [SYNC-TODAY] Encontradas ${todayReservations.length} reservaciones para hoy`);
    
    // Log del status de cada reservación
    todayReservations.forEach((res: any, idx: number) => {
      console.log(`📊 [SYNC-TODAY] Reservación ${idx + 1}:`, {
        id: res._id?.toString(),
        status: res.status,
        checkInDate: res.checkInDate
      });
    });
    
    // Normalizar reservaciones para sincronización
    const reservationsForSync = todayReservations.map((res: any) => {
      const reservation = res.toObject ? res.toObject() : JSON.parse(JSON.stringify(res));
      
      const userId = reservation.userId?._id?.toString() || 
                    reservation.userId?.id?.toString() || 
                    (reservation.userId && typeof reservation.userId === 'object' ? reservation.userId.toString() : reservation.userId) ||
                    reservation.userId;
      
      const roomId = reservation.roomId?._id?.toString() || 
                    reservation.roomId?.id?.toString() || 
                    (reservation.roomId && typeof reservation.roomId === 'object' ? reservation.roomId.toString() : reservation.roomId) ||
                    reservation.roomId;
      
      return {
        ...reservation,
        _id: reservation._id?.toString() || reservation._id,
        userId: userId,
        roomId: roomId
      };
    });
    
    console.log(`🔄 [SYNC-TODAY] Sincronizando ${reservationsForSync.length} reservaciones...`);
    await this.neo4jService.syncReservationsFromMongo(reservationsForSync);
    console.log('✅ [SYNC-TODAY] Reservaciones del día sincronizadas');
    
    return {
      success: true,
      message: `Sincronización de reservaciones del día completada: ${reservationsForSync.length} reservaciones`,
      data: {
        reservations: reservationsForSync.length,
        reservationsByStatus: reservationsForSync.reduce((acc: any, res: any) => {
          acc[res.status] = (acc[res.status] || 0) + 1;
          return acc;
        }, {})
      },
    };
  }

  @Post('sync/user-reservations/:userId')
  @UseGuards(JwtAuthGuard)
  async syncUserReservations(@Param('userId') userId: string) {
    try {
      console.log('🔄 [SYNC-USER] Sincronizando reservaciones del usuario:', userId);
      
      // Obtener todas las reservaciones del usuario con datos poblados
      const reservations = await this.reservationsService.findByUser(userId);
      console.log('🔄 [SYNC-USER] Reservaciones encontradas:', reservations.length);
      
      if (reservations.length === 0) {
        return {
          success: true,
          message: 'El usuario no tiene reservaciones para sincronizar',
          data: { reservations: 0 },
        };
      }
      
      // Asegurar que el usuario esté sincronizado
      const user = await this.usersService.findOne(userId);
      if (user) {
        const userObj = (user as any).toObject ? (user as any).toObject() : JSON.parse(JSON.stringify(user));
        await this.neo4jService.syncUsersFromMongo([userObj]);
        console.log('✅ [SYNC-USER] Usuario sincronizado');
      }
      
      // Sincronizar habitaciones de las reservaciones
      const roomIds = new Set<string>();
      reservations.forEach((res: any) => {
        const room = res.roomId || res.room;
        if (room) {
          const roomId = room._id?.toString() || room.id?.toString() || String(room._id || room.id);
          if (roomId) roomIds.add(roomId);
        }
      });
      
      if (roomIds.size > 0) {
        const rooms = await Promise.all(
          Array.from(roomIds).map(id => this.roomsService.findOne(id))
        );
        const validRooms = rooms.filter(r => r !== null);
        if (validRooms.length > 0) {
          const roomsForSync = validRooms.map((room: any) => {
            const roomObj = (room as any).toObject ? (room as any).toObject() : JSON.parse(JSON.stringify(room));
            return roomObj;
          });
          await this.neo4jService.syncRoomsFromMongo(roomsForSync);
          console.log('✅ [SYNC-USER] Habitaciones sincronizadas:', validRooms.length);
        }
      }
      
      // Normalizar reservaciones para sincronización
      const reservationsForSync = reservations.map((res: any) => {
        const reservation = (res as any).toObject ? (res as any).toObject() : JSON.parse(JSON.stringify(res));
        const userIdStr = reservation.userId?._id?.toString() || 
                         reservation.userId?.id?.toString() || 
                         userId;
        const roomIdStr = reservation.roomId?._id?.toString() || 
                         reservation.roomId?.id?.toString() || 
                         (reservation.roomId && typeof reservation.roomId === 'object' ? reservation.roomId.toString() : reservation.roomId);
        
        return {
          ...reservation,
          _id: reservation._id?.toString() || reservation._id,
          userId: userIdStr,
          roomId: roomIdStr
        };
      });
      
      // Sincronizar reservaciones
      await this.neo4jService.syncReservationsFromMongo(reservationsForSync);
      console.log('✅ [SYNC-USER] Reservaciones sincronizadas:', reservationsForSync.length);
      
      return {
        success: true,
        message: `Sincronizadas ${reservationsForSync.length} reservaciones del usuario`,
        data: { reservations: reservationsForSync.length },
      };
    } catch (error) {
      console.error('❌ [SYNC-USER] Error:', error);
      return {
        success: false,
        message: 'Error al sincronizar reservaciones del usuario',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // 📊 ENDPOINTS PARA VISUALIZACIÓN DE GRAFOS

  @Get('graph/visualization')
  @UseGuards(JwtAuthGuard)
  async getGraphForVisualization(@Query('limit') limit?: string) {
    try {
      const graphData = await this.neo4jService.getFullGraph();
      const maxNodes = limit ? parseInt(limit, 10) : 100;
      
      console.log('📊 Grafo obtenido:', {
        totalNodes: graphData.nodes?.length || 0,
        totalEdges: graphData.edges?.length || graphData.relationships?.length || 0
      });
      
      // Limitar nodos si es necesario
      if (graphData.nodes && graphData.nodes.length > maxNodes) {
        graphData.nodes = graphData.nodes.slice(0, maxNodes);
        // Filtrar relaciones que conecten solo los nodos seleccionados
        const nodeIds = new Set(graphData.nodes.map((n: any) => n.id));
        const edges = graphData.edges || graphData.relationships || [];
        graphData.edges = edges.filter((r: any) => 
          nodeIds.has(r.from) && nodeIds.has(r.to)
        );
        graphData.relationships = graphData.edges; // Mantener compatibilidad
      }
      
      return {
        success: true,
        data: graphData,
        message: 'Grafo obtenido exitosamente para visualización',
      };
    } catch (error) {
      console.error('❌ Error obteniendo grafo:', error);
      return {
        success: false,
        message: 'Error al obtener el grafo',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('graph/user/:userId')
  @UseGuards(JwtAuthGuard)
  async getUserGraph(@Param('userId') userId: string, @Request() req: any) {
    try {
      // Si no se proporciona userId en la URL, usar el del token JWT
      const finalUserId = userId || req.user?._id?.toString() || req.user?.sub;
      
      console.log('🔍 Obteniendo grafo para usuario:', finalUserId);
      
      if (!finalUserId) {
        return {
          success: false,
          message: 'ID de usuario no proporcionado',
          data: { nodes: [], edges: [] },
        };
      }
      
      const graphData = await this.neo4jService.getUserRelationshipsGraph(finalUserId);
      
      console.log('📊 Grafo obtenido:', {
        nodesCount: graphData.nodes?.length || 0,
        edgesCount: graphData.edges?.length || graphData.relationships?.length || 0,
        nodeTypes: graphData.nodes?.map((n: any) => n.type || n.group).filter((v: any, i: number, arr: any[]) => arr.indexOf(v) === i) || []
      });
      
      return {
        success: true,
        data: graphData,
        message: 'Grafo del usuario obtenido exitosamente',
      };
    } catch (error) {
      console.error('❌ Error obteniendo grafo del usuario:', error);
      return {
        success: false,
        message: 'Error al obtener el grafo del usuario',
        error: error instanceof Error ? error.message : String(error),
        data: { nodes: [], edges: [] },
      };
    }
  }
}
