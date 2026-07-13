import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Observable, from, lastValueFrom } from 'rxjs';
import { aplicarContexto, engancharRepositorios, rlsStorage } from './rls.context';

/**
 * Envuelve cada petición HTTP en una transacción de PostgreSQL y le fija dentro
 * la identidad del usuario (`app.user_id`, `app.roles`), que es lo que leen las
 * políticas de Row Level Security.
 *
 * Va DESPUÉS de los guards (por eso es un interceptor y no un middleware): antes
 * del guard, `req.user` todavía no existe.
 *
 * Si no hay usuario (login, registro, feed público), las variables quedan vacías
 * y las políticas deniegan por defecto: las tablas protegidas son todas de datos
 * privados, a las que nadie debería llegar sin identificarse.
 */
@Injectable()
export class RlsInterceptor implements NestInterceptor, OnModuleInit {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  onModuleInit(): void {
    engancharRepositorios(this.dataSource);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest();
    const userId: number | null = req.user?.userId ?? null;
    const roles: string[] = req.user?.roles ?? [];

    return from(this.ejecutar(userId, roles, next));
  }

  private async ejecutar(
    userId: number | null,
    roles: string[],
    next: CallHandler,
  ): Promise<any> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      await aplicarContexto(qr, userId, roles, false);

      // La suscripción al handler ocurre DENTRO de rlsStorage.run: así todo lo
      // que haga el controlador (y sus servicios) ve este QueryRunner.
      const resultado = await rlsStorage.run({ queryRunner: qr }, () =>
        lastValueFrom(next.handle()),
      );

      await qr.commitTransaction();
      return resultado;
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }
}
