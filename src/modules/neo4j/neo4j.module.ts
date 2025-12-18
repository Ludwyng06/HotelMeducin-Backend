import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Neo4jService } from '@services/neo4j.service';
import { Neo4jController } from '@controllers/neo4j.controller';
import { UsersModule } from '../users/users.module';
import { RoomsModule } from '../rooms/rooms.module';
import { ReservationsModule } from '../reservations/reservations.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    MongooseModule,
    forwardRef(() => UsersModule),
    forwardRef(() => RoomsModule),
    forwardRef(() => ReservationsModule),
  ],
  providers: [Neo4jService],
  controllers: [Neo4jController],
  exports: [Neo4jService],
})
export class Neo4jModule {}
