import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { jwtConstants } from './jwt.constants';
import { User } from '../../users/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Antes: ignoreExpiration:true — los tokens no caducaban NUNCA, así que un
      // token robado valía para siempre. Ahora se respeta el `expiresIn` (30d).
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: any) {
    // Comprobar que el usuario SIGUE EXISTIENDO y está activo: si borró su
    // cuenta (o un admin lo desactivó), su token debe dejar de funcionar al
    // instante. Sin esto, la sesión sobrevivía a la propia cuenta.
    const user = await this.userRepository.findOne({
      where: { id: payload.id },
      select: ['id', 'isActive'],
    });
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('La cuenta ya no está disponible');
    }

    return {
      userId: payload.id,
      username: payload.name,
      roles: payload.roles,
    };
  }
}
