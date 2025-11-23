import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { Rol } from 'src/roles/rol.entity';
import { JwtStrategy } from 'src/auth/jwt/jwt.strategy';
import { TypeOrmUserRepositoryProvider } from '../infrastructure/typeorm/user_repository_impl';

@Module({
  imports: [TypeOrmModule.forFeature([User, Rol])],
  controllers: [UsersController],
  providers: [UsersService, JwtStrategy],
  exports: [UsersService],
})
export class UsersModule {}
