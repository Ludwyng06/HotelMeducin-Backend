import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Neo4jService } from './neo4j.service';

/**
 * Servicio para inicializar y gestionar índices de bases de datos
 * Se ejecuta al iniciar la aplicación para asegurar que todos los índices estén creados
 */
@Injectable()
export class DatabaseIndexesService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseIndexesService.name);

  constructor(
    @InjectConnection() private connection: Connection,
    private neo4jService: Neo4jService,
  ) {}

  async onModuleInit() {
    this.logger.log('🔍 Inicializando índices de bases de datos...');
    
    try {
      // Crear índices de MongoDB
      await this.createMongoIndexes();
      
      // Crear índices de Neo4j (si está disponible)
      if (this.neo4jService.isConnected()) {
        await this.createNeo4jIndexes();
      } else {
        this.logger.warn('⚠️ Neo4j no está disponible. Se omitirán los índices de Neo4j.');
      }
      
      this.logger.log('✅ Índices de bases de datos inicializados correctamente');
    } catch (error) {
      this.logger.error('❌ Error al inicializar índices:', error);
      // No lanzar error para que la aplicación pueda iniciar aunque falle la indexación
    }
  }

  /**
   * Crea índices en MongoDB
   * Nota: Los índices definidos en los schemas se crean automáticamente,
   * pero este método verifica y crea índices adicionales si es necesario
   */
  private async createMongoIndexes() {
    this.logger.log('📊 Verificando índices de MongoDB...');

    const db = this.connection.db;
    
    if (!db) {
      this.logger.warn('⚠️ Base de datos de MongoDB no está disponible');
      return;
    }
    
    try {
      // Verificar índices existentes y crear los que falten
      const collections = await db.listCollections().toArray();
      
      for (const collection of collections) {
        const collectionName = collection.name;
        const indexes = await db.collection(collectionName).indexes();
        
        this.logger.debug(`📋 Colección: ${collectionName} - ${indexes.length} índices encontrados`);
      }
      
      this.logger.log('✅ Verificación de índices de MongoDB completada');
    } catch (error) {
      this.logger.error(`❌ Error al verificar índices de MongoDB:`, error);
      // No lanzar error para que la aplicación pueda continuar
    }
  }

  /**
   * Crea índices en Neo4j para propiedades comunes
   */
  private async createNeo4jIndexes() {
    // Verificar primero si Neo4j está disponible y conectado
    if (!this.neo4jService.isConnected()) {
      // No loguear warning aquí porque ya se logueó en onModuleInit
      return;
    }

    this.logger.log('🕸️ Creando índices de Neo4j...');

    const session = this.neo4jService.getSession();
    if (!session) {
      this.logger.warn('⚠️ No se pudo obtener sesión de Neo4j');
      return;
    }

    try {
      // Índices para propiedades comunes en diferentes tipos de nodos
      // Nota: Neo4j 5.x usa sintaxis diferente para índices
      const indexes = [
        // Índices para nodos User
        'CREATE INDEX user_id_index IF NOT EXISTS FOR (u:User) ON (u.id)',
        'CREATE INDEX user_email_index IF NOT EXISTS FOR (u:User) ON (u.email)',
        'CREATE INDEX user_googleId_index IF NOT EXISTS FOR (u:User) ON (u.googleId)',
        
        // Índices para nodos Reservation
        'CREATE INDEX reservation_id_index IF NOT EXISTS FOR (r:Reservation) ON (r.id)',
        'CREATE INDEX reservation_userId_index IF NOT EXISTS FOR (r:Reservation) ON (r.userId)',
        'CREATE INDEX reservation_roomId_index IF NOT EXISTS FOR (r:Reservation) ON (r.roomId)',
        'CREATE INDEX reservation_status_index IF NOT EXISTS FOR (r:Reservation) ON (r.status)',
        'CREATE INDEX reservation_checkInDate_index IF NOT EXISTS FOR (r:Reservation) ON (r.checkInDate)',
        
        // Índices para nodos Room
        'CREATE INDEX room_id_index IF NOT EXISTS FOR (rm:Room) ON (rm.id)',
        'CREATE INDEX room_roomNumber_index IF NOT EXISTS FOR (rm:Room) ON (rm.roomNumber)',
        'CREATE INDEX room_categoryId_index IF NOT EXISTS FOR (rm:Room) ON (rm.categoryId)',
        'CREATE INDEX room_isAvailable_index IF NOT EXISTS FOR (rm:Room) ON (rm.isAvailable)',
        
        // Índices para nodos Guest
        'CREATE INDEX guest_id_index IF NOT EXISTS FOR (g:Guest) ON (g.id)',
        'CREATE INDEX guest_reservationId_index IF NOT EXISTS FOR (g:Guest) ON (g.reservationId)',
        'CREATE INDEX guest_documentNumber_index IF NOT EXISTS FOR (g:Guest) ON (g.documentNumber)',
        'CREATE INDEX guest_email_index IF NOT EXISTS FOR (g:Guest) ON (g.email)',
        
        // Índices para nodos RoomCategory
        'CREATE INDEX roomCategory_id_index IF NOT EXISTS FOR (rc:RoomCategory) ON (rc.id)',
        'CREATE INDEX roomCategory_code_index IF NOT EXISTS FOR (rc:RoomCategory) ON (rc.code)',
      ];

      let connectionError = false;
      for (const indexQuery of indexes) {
        try {
          await session.run(indexQuery);
          this.logger.debug(`✅ Índice creado: ${indexQuery.substring(0, 50)}...`);
        } catch (error: any) {
          // Ignorar errores de índices que ya existen
          if (error.message?.includes('already exists') || error.message?.includes('equivalent')) {
            continue;
          }
          // Si es un error de conexión, detener el proceso
          if (error.message?.includes('Failed to connect') || error.message?.includes('connection')) {
            if (!connectionError) {
              this.logger.warn('⚠️ Error de conexión a Neo4j. Se detendrá la creación de índices.');
              connectionError = true;
            }
            break; // Salir del loop si hay error de conexión
          }
          // Otros errores: solo loguear el primero para evitar spam
          if (indexes.indexOf(indexQuery) === 0) {
            this.logger.warn(`⚠️ Error al crear índices de Neo4j: ${error.message?.substring(0, 100)}...`);
          }
        }
      }
      
      // Si hubo error de conexión, cerrar sesión y salir
      if (connectionError) {
        await session.close();
        this.logger.warn('⚠️ No se pudieron crear índices de Neo4j debido a problemas de conexión.');
        return;
      }

      // Solo intentar crear índices compuestos si no hubo error de conexión
      if (!connectionError) {
        const compositeIndexes = [
          // Índice compuesto para búsquedas de disponibilidad
          'CREATE INDEX reservation_room_status_dates_index IF NOT EXISTS FOR (r:Reservation) ON (r.roomId, r.status, r.checkInDate, r.checkOutDate)',
        ];

        for (const indexQuery of compositeIndexes) {
          try {
            await session.run(indexQuery);
            this.logger.debug(`✅ Índice compuesto creado: ${indexQuery.substring(0, 50)}...`);
          } catch (error: any) {
            // Ignorar errores de índices que ya existen
            if (error.message?.includes('already exists') || error.message?.includes('equivalent')) {
              continue;
            }
            // Si es un error de conexión, no es necesario loguear de nuevo
            if (!error.message?.includes('Failed to connect') && !error.message?.includes('connection')) {
              this.logger.warn(`⚠️ Error al crear índice compuesto: ${error.message?.substring(0, 100)}...`);
            }
          }
        }
      }

      await session.close();
      
      if (!connectionError) {
        this.logger.log('✅ Índices de Neo4j creados correctamente');
      }
    } catch (error) {
      this.logger.error('❌ Error al crear índices de Neo4j:', error);
      if (session) {
        await session.close();
      }
    }
  }

  /**
   * Método público para recrear índices manualmente si es necesario
   */
  async recreateIndexes() {
    this.logger.log('🔄 Recreando índices de bases de datos...');
    await this.createMongoIndexes();
    if (this.neo4jService.isConnected()) {
      await this.createNeo4jIndexes();
    }
    this.logger.log('✅ Índices recreados correctamente');
  }
}

