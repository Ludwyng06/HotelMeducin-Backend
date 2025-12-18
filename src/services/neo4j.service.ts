import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Driver, Session, Result } from 'neo4j-driver';
import { getNeo4jConfig, createNeo4jDriver } from '@config/neo4j.config';
import { TemporalUtils } from '@common/utils/temporal.utils';
import { Temporal } from '@js-temporal/polyfill';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Neo4jService.name);
  private driver: Driver | null = null;
  private isConnectedFlag: boolean = false;

  constructor(
    private configService: ConfigService,
    @InjectConnection() private connection: Connection,
  ) {
    const config = getNeo4jConfig(configService);
    this.driver = createNeo4jDriver(config);
  }

  async onModuleInit() {
    if (!this.driver) {
      this.logger.warn('⚠️ Neo4j driver no está disponible (credenciales no configuradas).');
      this.isConnectedFlag = false;
      return;
    }

    try {
      await this.driver.verifyConnectivity();
      this.isConnectedFlag = true;
      this.logger.log('✅ Conexión a Neo4j establecida exitosamente');
    } catch (error) {
      this.isConnectedFlag = false;
      this.logger.warn('⚠️ No se pudo conectar a Neo4j. El servicio continuará sin Neo4j.');
      this.logger.warn('⚠️ Funcionalidades de Neo4j no estarán disponibles hasta que se establezca la conexión.');
      // No lanzar el error para que el servidor pueda iniciar sin Neo4j
      // El servicio puede funcionar sin Neo4j, solo algunas funcionalidades no estarán disponibles
    }
  }

  async onModuleDestroy() {
    if (this.driver) {
      try {
        await this.driver.close();
        this.logger.log('🔌 Conexión a Neo4j cerrada');
      } catch (error) {
        this.logger.warn('⚠️ Error al cerrar conexión de Neo4j:', error);
      }
    }
  }

  getSession(): Session | null {
    if (!this.driver) {
      this.logger.warn('⚠️ Neo4j driver no está disponible');
      return null;
    }
    try {
      return this.driver.session();
    } catch (error) {
      this.logger.error('❌ Error al obtener sesión de Neo4j:', error);
      return null;
    }
  }

  isConnected(): boolean {
    // Verificar si el driver existe y si la conexión está activa
    if (!this.driver) {
      return false;
    }
    // Retornar el flag de conexión establecido en onModuleInit
    return this.isConnectedFlag;
  }

  // 🔷 MÉTODOS PARA NODOS

  /**
   * Crear un nodo en el grafo
   */
  async createNode(label: string, properties: Record<string, any>): Promise<any> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      const query = `
        CREATE (n:${label} $properties)
        RETURN n
      `;
      const result = await session.run(query, { properties });
      return result.records[0]?.get('n')?.properties;
    } finally {
      await session.close();
    }
  }

  /**
   * Buscar nodo por ID
   */
  async findNodeById(label: string, id: string): Promise<any> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      const query = `
        MATCH (n:${label} {id: $id})
        RETURN n
      `;
      const result = await session.run(query, { id });
      return result.records[0]?.get('n')?.properties;
    } finally {
      await session.close();
    }
  }

  /**
   * Buscar todos los nodos de un tipo
   */
  async findAllNodes(label: string): Promise<any[]> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      const query = `
        MATCH (n:${label})
        RETURN n
      `;
      const result = await session.run(query);
      return result.records.map(record => record.get('n').properties);
    } finally {
      await session.close();
    }
  }

  /**
   * Actualizar un nodo
   */
  async updateNode(label: string, id: string, properties: Record<string, any>): Promise<any> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      const query = `
        MATCH (n:${label} {id: $id})
        SET n += $properties
        RETURN n
      `;
      const result = await session.run(query, { id, properties });
      return result.records[0]?.get('n')?.properties;
    } finally {
      await session.close();
    }
  }

  /**
   * Eliminar un nodo
   */
  async deleteNode(label: string, id: string): Promise<boolean> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      const query = `
        MATCH (n:${label} {id: $id})
        DETACH DELETE n
        RETURN count(n) as deleted
      `;
      const result = await session.run(query, { id });
      return (result.records[0]?.get('deleted')?.toNumber() || 0) > 0;
    } finally {
      await session.close();
    }
  }

  // 🔗 MÉTODOS PARA RELACIONES

  /**
   * Crear una relación entre dos nodos
   */
  async createRelationship(
    fromLabel: string,
    fromId: string,
    relationshipType: string,
    toLabel: string,
    toId: string,
    properties?: Record<string, any>
  ): Promise<any> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      const query = `
        MATCH (a:${fromLabel} {id: $fromId})
        MATCH (b:${toLabel} {id: $toId})
        CREATE (a)-[r:${relationshipType} $properties]->(b)
        RETURN r, a, b
      `;
      const result = await session.run(query, {
        fromId,
        toId,
        properties: properties || {},
      });
      const record = result.records[0];
      return {
        relationship: record?.get('r')?.properties,
        from: record?.get('a')?.properties,
        to: record?.get('b')?.properties,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Eliminar una relación
   */
  async deleteRelationship(
    fromLabel: string,
    fromId: string,
    relationshipType: string,
    toLabel: string,
    toId: string
  ): Promise<boolean> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      const query = `
        MATCH (a:${fromLabel} {id: $fromId})-[r:${relationshipType}]->(b:${toLabel} {id: $toId})
        DELETE r
        RETURN count(r) as deleted
      `;
      const result = await session.run(query, { fromId, toId });
      return (result.records[0]?.get('deleted')?.toNumber() || 0) > 0;
    } finally {
      await session.close();
    }
  }

  /**
   * Obtener todas las relaciones de un nodo
   */
  async getNodeRelationships(label: string, id: string): Promise<any[]> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      const query = `
        MATCH (n:${label} {id: $id})-[r]-(connected)
        RETURN type(r) as relationshipType, r, connected, labels(connected) as connectedLabels
      `;
      const result = await session.run(query, { id });
      return result.records.map(record => ({
        type: record.get('relationshipType'),
        relationship: record.get('r').properties,
        node: record.get('connected').properties,
        nodeLabels: record.get('connectedLabels'),
      }));
    } finally {
      await session.close();
    }
  }

  // 📊 MÉTODOS PARA GRAFOS COMPLETOS

  /**
   * Obtener todo el grafo (todos los nodos y relaciones)
   */
  async getFullGraph(): Promise<any> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      // Filtrar solo reservaciones del día actual usando Temporal
      const today = TemporalUtils.today();
      const todayDateOnly = TemporalUtils.formatDate(today); // YYYY-MM-DD
      const todayStart = TemporalUtils.plainDateToDate(today).toISOString(); // 2025-12-14T00:00:00.000Z
      const tomorrow = TemporalUtils.addDays(today, 1);
      const tomorrowStart = TemporalUtils.plainDateToDate(tomorrow).toISOString(); // 2025-12-15T00:00:00.000Z
      
      this.logger.log(`📅 Filtrando reservaciones del día: ${todayDateOnly} (${todayStart} a ${tomorrowStart})`);
      
      // Consulta que filtra solo reservaciones del día actual y excluye nodos Unknown
      // Comparar como strings ISO (Neo4j almacena fechas como strings)
      // Usar solo comparación de strings para evitar errores de parsing con date()
      // Filtrar por prefijo de fecha (YYYY-MM-DD) para evitar problemas con formatos diferentes
      const query = `
        MATCH (u:User)-[r1:RESERVÓ]->(res:Reservation)
        WHERE res.checkInDate IS NOT NULL
          AND res.checkInDate STARTS WITH $todayDateOnly
        OPTIONAL MATCH (res)-[r2:RESERVADA_EN]->(room:Room)
        RETURN u, res, room, r1, r2, labels(u) as userLabels, 
               CASE WHEN res IS NOT NULL THEN labels(res) ELSE [] END as resLabels, 
               CASE WHEN room IS NOT NULL THEN labels(room) ELSE [] END as roomLabels
        LIMIT 500
      `;
      const result = await session.run(query, { todayDateOnly });
      
      this.logger.log(`📊 Reservaciones encontradas en Neo4j para hoy: ${result.records.length}`);
      
      const nodes = new Map();
      const relationships: any[] = [];

      // Log para debug: verificar qué reservaciones se están encontrando
      const reservationsFound: any[] = [];
      const uniqueReservations = new Set<string>();
      
      result.records.forEach(record => {
        const resNode = record.get('res');
        if (resNode) {
          const resId = resNode.properties.id;
          if (!uniqueReservations.has(resId)) {
            uniqueReservations.add(resId);
            reservationsFound.push({
              id: resId,
              checkInDate: resNode.properties.checkInDate,
              status: resNode.properties.status,
              checkInDateType: typeof resNode.properties.checkInDate
            });
          }
        }
      });
      
      this.logger.log(`📊 Reservaciones únicas encontradas en Neo4j: ${uniqueReservations.size}`);
      if (reservationsFound.length > 0) {
        this.logger.log(`📊 Detalles de reservaciones:`, JSON.stringify(reservationsFound, null, 2));
      } else {
        this.logger.warn(`⚠️ No se encontraron reservaciones en Neo4j para el día ${todayDateOnly}`);
        this.logger.warn(`⚠️ Rango de búsqueda: ${todayStart} a ${tomorrowStart}`);
      }

      result.records.forEach(record => {
        const userNode = record.get('u');
        const resNode = record.get('res');
        const roomNode = record.get('room');
        const rel1 = record.get('r1');
        const rel2 = record.get('r2');
        const userLabels = record.get('userLabels');
        const resLabels = record.get('resLabels');
        const roomLabels = record.get('roomLabels');

        // Función helper para obtener label y type de un nodo - EXCLUIR Unknown
        const getNodeInfo = (node: any, labels: string[]) => {
          const nodeType = labels && labels.length > 0 ? labels[0] : null;
          
          // Excluir nodos Unknown
          if (!nodeType || nodeType === 'Unknown') {
            return null;
          }
          
          let label = nodeType;
          
          if (nodeType === 'User') {
            label = `${node.properties.firstName || ''} ${node.properties.lastName || ''}`.trim() || node.properties.email || 'Usuario';
          } else if (nodeType === 'Reservation') {
            const checkIn = node.properties.checkInDate
              ? TemporalUtils.formatDateLocalized(
                  TemporalUtils.parsePlainDate(node.properties.checkInDate)
                )
              : 'N/A';
            // Normalizar status a minúsculas para consistencia
            const rawStatus = node.properties.status || 'pending';
            const status = rawStatus.toLowerCase();
            label = `Reserva ${checkIn} (${status})`;
            
            // Log para debug de reservaciones confirmadas
            if (status === 'confirmed' || rawStatus === 'confirmed' || rawStatus === 'CONFIRMED') {
              this.logger.log(`📊 [getNodeInfo] Reservación confirmada detectada: rawStatus=${rawStatus}, normalized=${status}`);
            }
          } else if (nodeType === 'Room') {
            label = node.properties.name || 'Habitación';
          }
          
          return { label, type: nodeType, group: nodeType.toLowerCase() };
        };

        // Agregar nodo de usuario (solo si no es Unknown)
        if (userNode) {
          const nodeInfo = getNodeInfo(userNode, userLabels);
          if (nodeInfo && !nodes.has(userNode.identity.toString())) {
            nodes.set(userNode.identity.toString(), {
              id: userNode.identity.toString(),
              label: nodeInfo.label,
              type: nodeInfo.type,
              group: nodeInfo.group,
              properties: userNode.properties,
            });
          }
        }

        // Agregar nodo de reservación (solo si no es Unknown)
        if (resNode) {
          const nodeInfo = getNodeInfo(resNode, resLabels);
          if (nodeInfo && !nodes.has(resNode.identity.toString())) {
            // Normalizar el status a minúsculas para consistencia
            const rawStatus = resNode.properties.status || 'pending';
            const normalizedStatus = rawStatus.toLowerCase();
            
            // Log para debug
            if (normalizedStatus === 'confirmed' || rawStatus === 'confirmed' || rawStatus === 'CONFIRMED') {
              this.logger.log(`📊 [getFullGraph] Reservación confirmada: ID=${resNode.identity.toString()}, rawStatus=${rawStatus}, normalized=${normalizedStatus}`);
            }
            
            nodes.set(resNode.identity.toString(), {
              id: resNode.identity.toString(),
              label: nodeInfo.label,
              type: nodeInfo.type,
              group: nodeInfo.group,
              properties: {
                ...resNode.properties,
                status: normalizedStatus, // Asegurar que el status esté normalizado
              },
            });
          }
        }

        // Agregar nodo de habitación (solo si no es Unknown)
        if (roomNode) {
          const nodeInfo = getNodeInfo(roomNode, roomLabels);
          if (nodeInfo && !nodes.has(roomNode.identity.toString())) {
            nodes.set(roomNode.identity.toString(), {
              id: roomNode.identity.toString(),
              label: nodeInfo.label,
              type: nodeInfo.type,
              group: nodeInfo.group,
              properties: roomNode.properties,
            });
          }
        }

        // Agregar relaciones solo si ambos nodos existen
        if (rel1 && userNode && resNode && nodes.has(userNode.identity.toString()) && nodes.has(resNode.identity.toString())) {
          relationships.push({
            id: `rel-${rel1.identity.toString()}`,
            type: 'RESERVÓ',
            label: 'RESERVÓ',
            from: userNode.identity.toString(),
            to: resNode.identity.toString(),
            properties: rel1.properties,
          });
        }

        if (rel2 && resNode && roomNode && nodes.has(resNode.identity.toString()) && nodes.has(roomNode.identity.toString())) {
          relationships.push({
            id: `rel-${rel2.identity.toString()}`,
            type: 'RESERVADA_EN',
            label: 'RESERVADA_EN',
            from: resNode.identity.toString(),
            to: roomNode.identity.toString(),
            properties: rel2.properties,
          });
        }
      });

      const finalNodes = Array.from(nodes.values());
      const reservationNodes = finalNodes.filter(n => n.type === 'Reservation');
      
      this.logger.log(`✅ Grafo generado: ${finalNodes.length} nodos totales, ${reservationNodes.length} reservaciones, ${relationships.length} relaciones`);
      
      return {
        nodes: finalNodes,
        edges: relationships,
        relationships,
        metadata: {
          totalNodes: finalNodes.length,
          totalReservations: reservationNodes.length,
          totalRelationships: relationships.length,
          date: todayDateOnly
        }
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Sincronizar usuarios de MongoDB a Neo4j
   */
  async syncUsersFromMongo(users: any[]): Promise<void> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      // Obtener todos los roles una vez para mapeo eficiente
      let roleMap: Record<string, string> = {};
      try {
        const UserRole = this.connection.models.UserRole || this.connection.model('UserRole', new (require('mongoose').Schema)({}, { strict: false }), 'userroles');
        const roles = await UserRole.find({}).lean();
        roles.forEach((role: any) => {
          roleMap[role._id.toString()] = role.name;
        });
        this.logger.log(`📋 Mapa de roles cargado: ${Object.keys(roleMap).length} roles`);
      } catch (e) {
        this.logger.warn('⚠️ No se pudo cargar el mapa de roles, usando valores por defecto');
      }
      
      for (const user of users) {
        // Determinar el nombre del rol
        let roleName = 'user'; // Default
        
        // Si roleId está poblado con el objeto completo
        if (user.roleId && typeof user.roleId === 'object' && user.roleId.name) {
          roleName = user.roleId.name;
        }
        // Si roleId es solo un string (ID), buscar en el mapa
        else if (user.roleId) {
          const roleIdStr = user.roleId.toString();
          if (roleMap[roleIdStr]) {
            roleName = roleMap[roleIdStr];
          } else {
            // Intentar buscar directamente si no está en el mapa
            try {
              const UserRole = this.connection.models.UserRole || this.connection.model('UserRole', new (require('mongoose').Schema)({}, { strict: false }), 'userroles');
              const role = await UserRole.findById(roleIdStr).lean();
              if (role && (role as any).name) {
                roleName = (role as any).name;
                roleMap[roleIdStr] = roleName; // Agregar al mapa para próximas iteraciones
              }
            } catch (e) {
              this.logger.warn(`⚠️ No se pudo obtener el rol para usuario ${user._id}, usando 'user' como default`);
            }
          }
        }
        // Si ya viene el nombre del rol directamente
        else if (user.role && typeof user.role === 'string') {
          roleName = user.role;
        }
        
        const query = `
          MERGE (u:User {id: $id})
          SET u.email = $email,
              u.firstName = $firstName,
              u.lastName = $lastName,
              u.role = $role
          RETURN u
        `;
        await session.run(query, {
          id: user._id.toString(),
          email: user.email || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: roleName,
        });
        
        this.logger.log(`✅ Usuario sincronizado: ${user.email} con rol: ${roleName}`);
      }
      this.logger.log(`✅ Sincronizados ${users.length} usuarios a Neo4j`);
    } finally {
      await session.close();
    }
  }

  /**
   * Sincronizar reservaciones de MongoDB a Neo4j
   */
  async syncReservationsFromMongo(reservations: any[]): Promise<void> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      for (const reservation of reservations) {
        // Normalizar el ID de la reservación
        const reservationId = reservation._id?.toString() || reservation.id?.toString() || String(reservation._id || reservation.id);
        
        if (!reservationId) {
          this.logger.warn('⚠️ Reservación sin ID válido, omitiendo:', reservation);
          continue;
        }
        
        this.logger.log(`🔄 Sincronizando reservación: ${reservationId}`);
        
        // Log detallado del status recibido para debug
        this.logger.log(`📊 [Sync] Status recibido para reservación ${reservationId}:`, {
          rawStatus: reservation.status,
          statusType: typeof reservation.status,
          hasStatus: 'status' in reservation
        });
        
        // Crear nodo de reservación
        const reservationQuery = `
          MERGE (r:Reservation {id: $id})
          SET r.checkInDate = $checkInDate,
              r.checkOutDate = $checkOutDate,
              r.totalPrice = $totalPrice,
              r.status = $status
          RETURN r
        `;
        // Convertir fechas a string ISO usando Temporal
        const checkInDateValue = reservation.checkInDate as any;
        const checkInDate = checkInDateValue
          ? (checkInDateValue instanceof Date
              ? TemporalUtils.dateToPlainDate(checkInDateValue)
              : checkInDateValue instanceof Temporal.PlainDate
              ? checkInDateValue
              : TemporalUtils.parsePlainDate(String(checkInDateValue))
            ).toString() + 'T00:00:00.000Z'
          : null;
        
        const checkOutDateValue = reservation.checkOutDate as any;
        const checkOutDate = checkOutDateValue
          ? (checkOutDateValue instanceof Date
              ? TemporalUtils.dateToPlainDate(checkOutDateValue)
              : checkOutDateValue instanceof Temporal.PlainDate
              ? checkOutDateValue
              : TemporalUtils.parsePlainDate(String(checkOutDateValue))
            ).toString() + 'T00:00:00.000Z'
          : null;
        
        // Normalizar status a minúsculas para consistencia
        const rawStatus = reservation.status || 'pending';
        const normalizedStatus = rawStatus.toLowerCase();
        
        await session.run(reservationQuery, {
          id: reservationId,
          checkInDate,
          checkOutDate,
          totalPrice: reservation.totalPrice || 0,
          status: normalizedStatus, // Usar status normalizado
        });
        this.logger.log(`✅ Nodo de reservación creado/actualizado: ${reservationId} con status: ${normalizedStatus} (raw: ${rawStatus})`);

        // Crear relación Usuario -> Reservación
        if (reservation.userId) {
          const userId = reservation.userId?.toString() || reservation.userId?._id?.toString() || String(reservation.userId);
          
          if (userId) {
            const userReservationQuery = `
              MATCH (u:User {id: $userId})
              MATCH (r:Reservation {id: $reservationId})
              MERGE (u)-[rel:RESERVÓ]->(r)
              RETURN rel
            `;
            const userRelResult = await session.run(userReservationQuery, {
              userId: userId,
              reservationId: reservationId,
            });
            
            if (userRelResult.records.length > 0) {
              this.logger.log(`✅ Relación Usuario->Reservación creada: ${userId} -> ${reservationId}`);
            } else {
              this.logger.warn(`⚠️ No se pudo crear relación Usuario->Reservación. Usuario ${userId} o Reservación ${reservationId} no encontrados`);
            }
          } else {
            this.logger.warn(`⚠️ userId inválido para reservación ${reservationId}`);
          }
        }

        // Crear relación Reservación -> Habitación
        if (reservation.roomId) {
          const roomId = reservation.roomId?.toString() || reservation.roomId?._id?.toString() || String(reservation.roomId);
          
          if (roomId) {
            const roomReservationQuery = `
              MATCH (r:Reservation {id: $reservationId})
              MATCH (room:Room {id: $roomId})
              MERGE (r)-[rel:RESERVADA_EN]->(room)
              RETURN rel
            `;
            const roomRelResult = await session.run(roomReservationQuery, {
              roomId: roomId,
              reservationId: reservationId,
            });
            
            if (roomRelResult.records.length > 0) {
              this.logger.log(`✅ Relación Reservación->Habitación creada: ${reservationId} -> ${roomId}`);
            } else {
              this.logger.warn(`⚠️ No se pudo crear relación Reservación->Habitación. Reservación ${reservationId} o Habitación ${roomId} no encontrados`);
            }
          } else {
            this.logger.warn(`⚠️ roomId inválido para reservación ${reservationId}`);
          }
        }
      }
      this.logger.log(`✅ Sincronizadas ${reservations.length} reservaciones a Neo4j`);
    } catch (error) {
      this.logger.error(`❌ Error sincronizando reservaciones: ${error}`);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Sincronizar habitaciones de MongoDB a Neo4j
   */
  async syncRoomsFromMongo(rooms: any[]): Promise<void> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      for (const room of rooms) {
        const query = `
          MERGE (r:Room {id: $id})
          SET r.name = $name,
              r.price = $price,
              r.capacity = $capacity,
              r.isAvailable = $isAvailable
          RETURN r
        `;
        await session.run(query, {
          id: room._id.toString(),
          name: room.name,
          price: room.price,
          capacity: room.capacity,
          isAvailable: room.isAvailable,
        });
      }
      this.logger.log(`✅ Sincronizadas ${rooms.length} habitaciones a Neo4j`);
    } finally {
      await session.close();
    }
  }

  /**
   * Obtener análisis de relaciones para PDF
   */
  async getNetworkAnalysis(): Promise<any> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      // Usuarios más frecuentes
      const topUsersQuery = `
        MATCH (u:User)-[r:RESERVÓ]->()
        RETURN u.id as userId, u.email as email, u.firstName as firstName, 
               u.lastName as lastName, count(r) as totalReservations
        ORDER BY totalReservations DESC
        LIMIT 10
      `;
      const topUsersResult = await session.run(topUsersQuery);
      const topUsers = topUsersResult.records.map(record => ({
        userId: record.get('userId'),
        email: record.get('email'),
        firstName: record.get('firstName'),
        lastName: record.get('lastName'),
        totalReservations: record.get('totalReservations').toNumber()
      }));

      // Habitaciones más reservadas
      const topRoomsQuery = `
        MATCH ()-[r:RESERVADA_EN]->(room:Room)
        RETURN room.id as roomId, room.name as roomName, 
               room.price as price, count(r) as totalReservations
        ORDER BY totalReservations DESC
        LIMIT 10
      `;
      const topRoomsResult = await session.run(topRoomsQuery);
      const topRooms = topRoomsResult.records.map(record => ({
        roomId: record.get('roomId'),
        roomName: record.get('roomName'),
        price: record.get('price'),
        totalReservations: record.get('totalReservations').toNumber()
      }));

      // Patrones de reservación (habitaciones reservadas juntas)
      const patternsQuery = `
        MATCH (u:User)-[:RESERVÓ]->(r1:Reservation)-[:RESERVADA_EN]->(room1:Room)
        MATCH (u)-[:RESERVÓ]->(r2:Reservation)-[:RESERVADA_EN]->(room2:Room)
        WHERE room1 <> room2 AND r1 <> r2
        WITH room1, room2, count(*) as veces_juntas
        WHERE veces_juntas >= 2
        RETURN room1.name as room1Name, room2.name as room2Name, veces_juntas
        ORDER BY veces_juntas DESC
        LIMIT 10
      `;
      const patternsResult = await session.run(patternsQuery);
      const patterns = patternsResult.records.map(record => ({
        room1Name: record.get('room1Name'),
        room2Name: record.get('room2Name'),
        vecesJuntas: record.get('veces_juntas').toNumber()
      }));

      // Estadísticas generales - Consulta corregida para contar todos los nodos de cada tipo
      const statsQuery = `
        MATCH (u:User)
        WITH count(DISTINCT u) as totalUsers
        MATCH (room:Room)
        WITH totalUsers, count(DISTINCT room) as totalRooms
        MATCH (res:Reservation)
        WITH totalUsers, totalRooms, count(DISTINCT res) as totalReservations
        RETURN totalUsers, totalRooms, totalReservations, totalReservations as totalReservationsAll
      `;
      const statsResult = await session.run(statsQuery);
      const stats = statsResult.records[0] ? {
        totalUsers: statsResult.records[0].get('totalUsers').toNumber(),
        totalReservations: statsResult.records[0].get('totalReservations').toNumber(),
        totalRooms: statsResult.records[0].get('totalRooms').toNumber(),
        totalReservationsAll: statsResult.records[0].get('totalReservationsAll').toNumber()
      } : {
        totalUsers: 0,
        totalReservations: 0,
        totalRooms: 0,
        totalReservationsAll: 0
      };

      return {
        topUsers,
        topRooms,
        patterns,
        stats
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Obtener análisis de relaciones de un usuario específico
   */
  async getUserNetworkAnalysis(userId: string): Promise<any> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      // Información del usuario y sus reservaciones
      const userQuery = `
        MATCH (u:User {id: $userId})
        OPTIONAL MATCH (u)-[:RESERVÓ]->(r:Reservation)-[:RESERVADA_EN]->(room:Room)
        RETURN u, 
               collect({
                 reservationId: r.id,
                 checkInDate: r.checkInDate,
                 checkOutDate: r.checkOutDate,
                 totalPrice: r.totalPrice,
                 status: r.status,
                 roomName: room.name,
                 roomId: room.id
               }) as reservations
      `;
      const userResult = await session.run(userQuery, { userId });
      
      if (userResult.records.length === 0) {
        return null;
      }

      const record = userResult.records[0];
      const user = record.get('u').properties;
      const reservations = record.get('reservations');

      // Habitaciones favoritas (más reservadas por este usuario)
      const favoriteRoomsQuery = `
        MATCH (u:User {id: $userId})-[:RESERVÓ]->(r:Reservation)-[:RESERVADA_EN]->(room:Room)
        RETURN room.name as roomName, room.id as roomId, count(r) as vecesReservada
        ORDER BY vecesReservada DESC
        LIMIT 5
      `;
      const favoriteRoomsResult = await session.run(favoriteRoomsQuery, { userId });
      const favoriteRooms = favoriteRoomsResult.records.map(record => ({
        roomName: record.get('roomName'),
        roomId: record.get('roomId'),
        vecesReservada: record.get('vecesReservada').toNumber()
      }));

      // Usuarios similares (reservan las mismas habitaciones)
      const similarUsersQuery = `
        MATCH (u:User {id: $userId})-[:RESERVÓ]->(r1:Reservation)-[:RESERVADA_EN]->(room:Room)
        MATCH (u2:User)-[:RESERVÓ]->(r2:Reservation)-[:RESERVADA_EN]->(room)
        WHERE u2.id <> $userId
        RETURN DISTINCT u2.email as email, u2.firstName as firstName, 
               u2.lastName as lastName, count(DISTINCT room) as habitacionesComunes
        ORDER BY habitacionesComunes DESC
        LIMIT 5
      `;
      const similarUsersResult = await session.run(similarUsersQuery, { userId });
      const similarUsers = similarUsersResult.records.map(record => ({
        email: record.get('email'),
        firstName: record.get('firstName'),
        lastName: record.get('lastName'),
        habitacionesComunes: record.get('habitacionesComunes').toNumber()
      }));

      // Estadísticas del usuario
      const userStatsQuery = `
        MATCH (u:User {id: $userId})
        OPTIONAL MATCH (u)-[:RESERVÓ]->(r:Reservation)
        OPTIONAL MATCH (r)-[:RESERVADA_EN]->(room:Room)
        RETURN 
          count(DISTINCT r) as totalReservations,
          sum(r.totalPrice) as totalGastado,
          avg(r.totalPrice) as promedioReservacion,
          count(DISTINCT room) as habitacionesDiferentes
      `;
      const userStatsResult = await session.run(userStatsQuery, { userId });
      const userStats = userStatsResult.records[0] ? {
        totalReservations: userStatsResult.records[0].get('totalReservations').toNumber(),
        totalGastado: userStatsResult.records[0].get('totalGastado')?.toNumber() || 0,
        promedioReservacion: userStatsResult.records[0].get('promedioReservacion')?.toNumber() || 0,
        habitacionesDiferentes: userStatsResult.records[0].get('habitacionesDiferentes').toNumber()
      } : {
        totalReservations: 0,
        totalGastado: 0,
        promedioReservacion: 0,
        habitacionesDiferentes: 0
      };

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        reservations: reservations || [],
        favoriteRooms,
        similarUsers,
        stats: userStats
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Obtener grafo de relaciones de un usuario específico para visualización
   */
  async getUserRelationshipsGraph(userId: string): Promise<any> {
    const session = this.getSession();
    if (!session) {
      throw new Error('Neo4j no está disponible');
    }
    try {
      this.logger.log(`🔍 Buscando grafo para usuario: ${userId}`);
      
      // Primero verificar si el usuario existe
      const userCheckQuery = `MATCH (u:User {id: $userId}) RETURN u`;
      const userCheckResult = await session.run(userCheckQuery, { userId });
      
      if (userCheckResult.records.length === 0) {
        this.logger.warn(`⚠️ Usuario ${userId} no encontrado en Neo4j`);
        return {
          nodes: [],
          edges: [],
          relationships: [],
        };
      }
      
      // Filtrar solo reservaciones del día actual usando Temporal
      const today = TemporalUtils.today();
      const todayDateOnly = TemporalUtils.formatDate(today); // YYYY-MM-DD
      
      this.logger.log(`📅 Obteniendo reservaciones del día actual (${todayDateOnly}) para usuario ${userId}`);
      
      // Consulta que devuelve el usuario y solo reservaciones del día actual
      const query = `
        MATCH (u:User {id: $userId})
        MATCH (u)-[r1:RESERVÓ]->(res:Reservation)
        WHERE res.checkInDate IS NOT NULL
          AND res.checkInDate STARTS WITH $todayDateOnly
        OPTIONAL MATCH (res)-[r2:RESERVADA_EN]->(room:Room)
        RETURN u, res, room, r1, r2, 
               u.id as userId,
               res.id as resId,
               room.id as roomId,
               labels(u) as userLabels, 
               labels(res) as resLabels, 
               CASE WHEN room IS NOT NULL THEN labels(room) ELSE [] END as roomLabels
        ORDER BY res.checkInDate DESC
      `;
      const result = await session.run(query, { userId, todayDateOnly });
      
      this.logger.log(`📊 Registros encontrados para usuario ${userId} (día ${todayDateOnly}): ${result.records.length}`);
      
      // Log detallado de lo que se encontró - verificar tanto el nodo como el ID
      const hasReservations = result.records.some(r => {
        const res = r.get('res');
        const resId = r.get('resId');
        return res !== null && resId !== null && resId !== undefined;
      });
      const hasRooms = result.records.some(r => {
        const room = r.get('room');
        const roomId = r.get('roomId');
        return room !== null && roomId !== null && roomId !== undefined;
      });
      this.logger.log(`📊 Detalle: ${hasReservations ? 'Tiene reservaciones' : 'Sin reservaciones'}, ${hasRooms ? 'Tiene habitaciones' : 'Sin habitaciones'}`);
      
      // Log adicional para debug - mostrar todos los registros con detalles
      if (result.records.length > 0) {
        this.logger.log(`📊 Analizando ${result.records.length} registros...`);
        result.records.forEach((record, idx) => {
          const res = record.get('res');
          const room = record.get('room');
          const resId = record.get('resId');
          const roomId = record.get('roomId');
          const userId = record.get('userId');
          this.logger.log(`📊 Registro ${idx + 1}: userId=${userId}, resId=${resId}, roomId=${roomId}, hasResNode=${!!res}, hasRoomNode=${!!room}, resIdType=${typeof resId}`);
        });
      }
      
      const nodes = new Map();
      const relationships: any[] = [];

      // Siempre agregar el nodo del usuario primero
      if (userCheckResult.records.length > 0) {
        const userNode = userCheckResult.records[0].get('u');
        if (userNode) {
          const userId = userNode.properties?.id || userNode.identity?.toString();
          if (userId) {
            nodes.set(userId, {
              id: userId,
              label: `${userNode.properties.firstName || ''} ${userNode.properties.lastName || ''}`.trim() || userNode.properties.email || 'Usuario',
              group: 'user',
              type: 'User',
              properties: userNode.properties,
            });
          }
        }
      }

      result.records.forEach((record, recordIdx) => {
        const userNode = record.get('u');
        const resNode = record.get('res');
        const roomNode = record.get('room');
        const rel1 = record.get('r1');
        const rel2 = record.get('r2');
        
        // Si no hay reservación, saltar este registro
        if (!resNode) {
          return;
        }
        
        // Obtener IDs directamente de los nodos (más confiable que los campos del RETURN)
        const userId = userNode?.properties?.id || userNode?.identity?.toString() || record.get('userId');
        const resId = resNode.properties?.id || resNode.identity?.toString() || record.get('resId');
        const roomId = roomNode?.properties?.id || roomNode?.identity?.toString() || record.get('roomId');

        // Log detallado
        this.logger.log(`📊 Procesando registro ${recordIdx + 1}: userId=${userId}, resId=${resId}, roomId=${roomId}`);

        // Validar IDs críticos
        if (!userId || !resId) {
          this.logger.warn(`⚠️ Registro ${recordIdx + 1} omitido: userId=${!!userId}, resId=${!!resId}`);
          return;
        }

        // Agregar nodo de usuario (si no está ya agregado)
        if (userNode && userId) {
          if (!nodes.has(userId)) {
            nodes.set(userId, {
              id: userId,
              label: `${userNode.properties.firstName || ''} ${userNode.properties.lastName || ''}`.trim() || userNode.properties.email || 'Usuario',
              group: 'user',
              type: 'User',
              properties: userNode.properties,
            });
            this.logger.log(`✅ Nodo de usuario agregado: ${userId}`);
          }
        }

        // Agregar nodo de reservación (SIEMPRE que tengamos resNode y resId)
        if (resNode && resId) {
          if (!nodes.has(resId)) {
            const checkIn = resNode.properties.checkInDate
              ? TemporalUtils.formatDateLocalized(
                  TemporalUtils.parsePlainDate(resNode.properties.checkInDate)
                )
              : 'N/A';
            // Normalizar status a minúsculas para consistencia
            const rawStatus = resNode.properties.status || 'pending';
            const normalizedStatus = rawStatus.toLowerCase();
            
            nodes.set(resId, {
              id: resId,
              label: `Reserva ${checkIn} (${normalizedStatus})`,
              group: 'reservation',
              type: 'Reservation',
              properties: {
                ...resNode.properties,
                status: normalizedStatus, // Asegurar que el status esté normalizado
              },
            });
            
            this.logger.log(`✅ Nodo de reservación agregado: ID=${resId}, checkInDate=${resNode.properties.checkInDate}, status=${normalizedStatus} (raw: ${rawStatus})`);
          } else {
            this.logger.log(`ℹ️ Nodo de reservación ya existe: ${resId}`);
          }
        } else {
          this.logger.warn(`⚠️ No se puede agregar nodo de reservación: resNode=${!!resNode}, resId=${resId}`);
        }

        // Agregar nodo de habitación
        if (roomNode && roomId) {
          if (!nodes.has(roomId)) {
            nodes.set(roomId, {
              id: roomId,
              label: roomNode.properties.name || roomNode.properties.roomNumber || 'Habitación',
              group: 'room',
              type: 'Room',
              properties: roomNode.properties,
            });
            this.logger.log(`✅ Nodo de habitación agregado: ID=${roomId}, name=${roomNode.properties.name || roomNode.properties.roomNumber}`);
          }
        }

        // Agregar relaciones usando los IDs consistentes (solo si ambos nodos existen)
        if (rel1 && userNode && resNode && userId && resId) {
          // Verificar que no exista ya esta relación
          const relExists = relationships.some(r => r.from === userId && r.to === resId);
          if (!relExists) {
            relationships.push({
              id: `rel-user-res-${userId}-${resId}`,
              from: userId,
              to: resId,
              label: 'RESERVÓ',
              type: 'RESERVÓ',
            });
            this.logger.log(`✅ Relación Usuario->Reservación agregada: ${userId} -> ${resId}`);
          }
        }

        if (rel2 && resNode && roomNode && resId && roomId) {
          // Verificar que no exista ya esta relación
          const relExists = relationships.some(r => r.from === resId && r.to === roomId);
          if (!relExists) {
            relationships.push({
              id: `rel-res-room-${resId}-${roomId}`,
              from: resId,
              to: roomId,
              label: 'RESERVADA_EN',
              type: 'RESERVADA_EN',
            });
            this.logger.log(`✅ Relación Reservación->Habitación agregada: ${resId} -> ${roomId}`);
          }
        }
      });

      const finalNodes = Array.from(nodes.values());
      
      // Log detallado del resultado
      this.logger.log(`✅ Grafo generado: ${finalNodes.length} nodos, ${relationships.length} relaciones`);
      this.logger.log(`📊 Desglose de nodos:`, {
        usuarios: finalNodes.filter(n => n.type === 'User').length,
        reservaciones: finalNodes.filter(n => n.type === 'Reservation').length,
        habitaciones: finalNodes.filter(n => n.type === 'Room').length
      });
      this.logger.log(`📊 Desglose de relaciones:`, {
        usuarioReservacion: relationships.filter(r => r.type === 'RESERVÓ').length,
        reservacionHabitacion: relationships.filter(r => r.type === 'RESERVADA_EN').length
      });

      return {
        nodes: finalNodes,
        edges: relationships, // Usar 'edges' para consistencia
        relationships, // Mantener también para compatibilidad
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo grafo del usuario: ${error}`);
      throw error;
    } finally {
      await session.close();
    }
  }
}
