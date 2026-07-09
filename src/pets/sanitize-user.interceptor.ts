import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Campos del usuario que NUNCA deben salir en una respuesta pública. */
const SENSITIVE_USER_FIELDS = [
  'password',
  'notification_token',
  'resetPasswordToken',
  'resetPasswordExpires',
];

/**
 * Recorre la respuesta y borra los campos sensibles de cualquier objeto `user`
 * embebido. `GET /api/pets` es público y trae la relación `pet.user` completa;
 * sin esto expone el hash de la contraseña y los tokens de reseteo de cada dueño.
 */
function scrub(node: any, seen = new Set<any>()): void {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) scrub(item, seen);
    return;
  }

  for (const key of Object.keys(node)) {
    // Un objeto con estos campos es un usuario, venga o no en una clave 'user'.
    if (key === 'password' || key === 'resetPasswordToken') {
      for (const f of SENSITIVE_USER_FIELDS) delete node[f];
    }
    scrub(node[key], seen);
  }
}

@Injectable()
export class SanitizeUserInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        scrub(data);
        return data;
      }),
    );
  }
}
