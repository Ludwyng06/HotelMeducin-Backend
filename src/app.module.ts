import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getMongoConfig } from './config/mongodb.config';
import { getRedisConfig } from './config/redis.config';
import { RedisService } from './config/redis.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { ServicesModule } from './modules/services/services.module';
import { AuthModule } from './modules/auth/auth.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RedisCacheModule } from './modules/redis-cache/redis-cache.module';
import { RedisTestModule } from './modules/redis-test/redis-test.module';
import { RedisDashboardModule } from './modules/redis-dashboard/redis-dashboard.module';
import { RedisAdvancedModule } from './modules/redis-advanced/redis-advanced.module';
import { HotelMetricsModule } from './modules/reports/hotel-metrics.module';
import { DocumentTypesModule } from './modules/document-types/document-types.module';
import { GuestsModule } from './modules/guests/guests.module';
import { ReservationDraftsModule } from './modules/reservation-drafts/reservation-drafts.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { Neo4jModule } from './modules/neo4j/neo4j.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { DatabaseIndexesService } from './services/database-indexes.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getMongoConfig,
      inject: [ConfigService],
    }),
    JwtModule.register({
      secret: 'clave_super_segura_para_jwt_hotel_meducin_2024',
      signOptions: { expiresIn: '24h' },
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: getRedisConfig,
      inject: [ConfigService],
      isGlobal: true,
    }),
    UsersModule,
    RoomsModule,
    ReservationsModule,
    ServicesModule,
    AuthModule,
    ReportsModule,
    RedisCacheModule,
    RedisTestModule,
    RedisDashboardModule,
    RedisAdvancedModule,
    HotelMetricsModule,
    DocumentTypesModule,
    GuestsModule,
    ReservationDraftsModule,
    PdfModule,
    NotificationsModule,
    Neo4jModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RedisService,
    DatabaseIndexesService, // Servicio para inicializar índices de bases de datos
    // 🔐 Guard global - proteger todas las rutas por defecto
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
