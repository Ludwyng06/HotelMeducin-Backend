import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Driver, Session, Result } from 'neo4j-driver';
import { getNeo4jConfig, createNeo4jDriver } from '@config/neo4j.config';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Neo4jService.name);
  private driver: Driver | null = null;
  private isConnectedFlag: boolean = false;

  constructor(private configService: ConfigService) {
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
      // Filtrar solo reservaciones del día actual
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString(); // 2025-12-14T00:00:00.000Z
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStart = tomorrow.toISOString(); // 2025-12-15T00:00:00.000Z
      
      // También crear formato de fecha solo (YYYY-MM-DD) para comparación flexible
      const todayDateOnly = today.toISOString().split('T')[0]; // 2025-12-14
      
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
            const checkIn = node.properties.checkInDate ? new Date(node.properties.checkInDate).toLocaleDateString('es-CO') : 'N/A';
            const status = node.properties.status || 'pending';
            label = `Reserva ${checkIn} (${status})`;
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
            nodes.set(resNode.identity.toString(), {
              id: resNode.identity.toString(),
              label: nodeInfo.label,
              type: nodeInfo.type,
              group: nodeInfo.group,
              properties: resNode.properties,
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
      for (const user of users) {
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
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: (user.roleId as any)?.name || 'user',
        });
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
        
        // Crear nodo de reservación
        const reservationQuery = `
          MERGE (r:Reservation {id: $id})
          SET r.checkInDate = $checkInDate,
              r.checkOutDate = $checkOutDate,
              r.totalPrice = $totalPrice,
              r.status = $status
          RETURN r
        `;
        await session.run(reservationQuery, {
          id: reservationId,
          checkInDate: reservation.checkInDate ? new Date(reservation.checkInDate).toISOString() : null,
          checkOutDate: reservation.checkOutDate ? new Date(reservation.checkOutDate).toISOString() : null,
          totalPrice: reservation.totalPrice || 0,
          status: reservation.status || 'pending',
        });
        this.logger.log(`✅ Nodo de reservación creado/actualizado: ${reservationId}`);

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
      
      // Consulta mejorada: obtener usuario y todas las reservaciones del día actual
      // Filtrar por checkInDate del día actual, incluyendo todos los estados (pending, confirmed, cancelled, completed)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayDateOnly = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      this.logger.log(`📅 Filtrando reservaciones del día actual para usuario ${userId}: ${todayDateOnly}`);
      
      const query = `
        MATCH (u:User {id: $userId})
        OPTIONAL MATCH (u)-[r1:RESERVÓ]->(res:Reservation)
        WHERE res IS NULL OR (res.checkInDate IS NOT NULL AND res.checkInDate STARTS WITH $todayDateOnly)
        OPTIONAL MATCH (res)-[r2:RESERVADA_EN]->(room:Room)
        RETURN u, res, room, r1, r2, labels(u) as userLabels, 
               CASE WHEN res IS NOT NULL THEN labels(res) ELSE [] END as resLabels, 
               CASE WHEN room IS NOT NULL THEN labels(room) ELSE [] END as roomLabels
        ORDER BY res.checkInDate DESC
      `;
      const result = await session.run(query, { userId, todayDateOnly });
      
      this.logger.log(`📊 Registros encontrados para usuario ${userId}: ${result.records.length}`);
      
      // Log detallado de lo que se encontró
      const hasReservations = result.records.some(r => r.get('res') !== null);
      const hasRooms = result.records.some(r => r.get('room') !== null);
      this.logger.log(`📊 Detalle: ${hasReservations ? 'Tiene reservaciones' : 'Sin reservaciones'}, ${hasRooms ? 'Tiene habitaciones' : 'Sin habitaciones'}`);
      
      const nodes = new Map();
      const relationships: any[] = [];

      // Siempre agregar el nodo del usuario primero
      if (userCheckResult.records.length > 0) {
        const userNode = userCheckResult.records[0].get('u');
        if (userNode) {
          nodes.set(userNode.identity.toString(), {
            id: userNode.identity.toString(),
            label: `${userNode.properties.firstName || ''} ${userNode.properties.lastName || ''}`.trim() || userNode.properties.email || 'Usuario',
            group: 'user',
            type: 'User',
            properties: userNode.properties,
          });
        }
      }

      result.records.forEach(record => {
        const userNode = record.get('u');
        const resNode = record.get('res');
        const roomNode = record.get('room');
        const rel1 = record.get('r1');
        const rel2 = record.get('r2');

        // Agregar nodo de usuario (si no está ya agregado)
        if (userNode && !nodes.has(userNode.identity.toString())) {
          nodes.set(userNode.identity.toString(), {
            id: userNode.identity.toString(),
            label: `${userNode.properties.firstName || ''} ${userNode.properties.lastName || ''}`.trim() || userNode.properties.email || 'Usuario',
            group: 'user',
            type: 'User',
            properties: userNode.properties,
          });
        }

        // Agregar nodo de reservación
        if (resNode && !nodes.has(resNode.identity.toString())) {
          const checkIn = resNode.properties.checkInDate ? new Date(resNode.properties.checkInDate).toLocaleDateString('es-CO') : 'N/A';
          const status = resNode.properties.status || 'pending';
          nodes.set(resNode.identity.toString(), {
            id: resNode.identity.toString(),
            label: `Reserva ${checkIn} (${status})`,
            group: 'reservation',
            type: 'Reservation',
            properties: resNode.properties,
          });
          
          // Log para debug
          this.logger.log(`📊 Reservación encontrada: ID=${resNode.identity.toString()}, checkInDate=${resNode.properties.checkInDate}, status=${status}`);
        }

        // Agregar nodo de habitación
        if (roomNode && !nodes.has(roomNode.identity.toString())) {
          nodes.set(roomNode.identity.toString(), {
            id: roomNode.identity.toString(),
            label: roomNode.properties.name || 'Habitación',
            group: 'room',
            type: 'Room',
            properties: roomNode.properties,
          });
        }

        // Agregar relaciones
        if (rel1 && userNode && resNode) {
          relationships.push({
            id: `rel-${rel1.identity.toString()}`,
            from: userNode.identity.toString(),
            to: resNode.identity.toString(),
            label: 'RESERVÓ',
            type: 'RESERVÓ',
          });
        }

        if (rel2 && resNode && roomNode) {
          relationships.push({
            id: `rel-${rel2.identity.toString()}`,
            from: resNode.identity.toString(),
            to: roomNode.identity.toString(),
            label: 'RESERVADA_EN',
            type: 'RESERVADA_EN',
          });
        }
      });

      const finalNodes = Array.from(nodes.values());
      this.logger.log(`✅ Grafo generado: ${finalNodes.length} nodos, ${relationships.length} relaciones`);

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
