import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './jwt/jwt.constants';
import { JwtStrategy } from './jwt/jwt.strategy';
import { RolesService } from 'src/roles/roles.service';
import { Rol } from 'src/roles/rol.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Rol]),
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      // 30 días es razonable para una app móvil (evita re-login constante) ahora
      // que la expiración SÍ se valida (antes se ignoraba y no caducaba nunca).
      signOptions: { expiresIn: '30d' },
    }),
    forwardRef(() => NotificationsModule),
  ],
  providers: [AuthService, RolesService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
