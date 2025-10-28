import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getMongoConfig } from './config/mongodb.config';
import { getRedisConfig } from './config/redis.config';
import { RedisService } from './config/redis.service';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot('mongodb://localhost:27017/hotel_meducin_db'),
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
  ],
  controllers: [AppController],
  providers: [AppService, RedisService],
})
export class AppModule {}
