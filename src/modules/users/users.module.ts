import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './services/users.service';
import { UserRolesService } from './services/user-roles.service';
import { UsersController } from './controllers/users.controller';
import { SuperadminController } from './controllers/superadmin.controller';
import { User, UserSchema } from './schemas/user.schema';
import { UserRole, UserRoleSchema } from './schemas/user-role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserRole.name, schema: UserRoleSchema }
    ])
  ],
  controllers: [UsersController, SuperadminController],
  providers: [UsersService, UserRolesService],
  exports: [UsersService, UserRolesService],
})
export class UsersModule {}
