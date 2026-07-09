import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Campos del usuario que NUNCA deben salir en una respuesta HTTP. */
const SENSITIVE_USER_FIELDS = [
  'password',
  'notification_token',
  'resetPasswordToken',
  'resetPasswordExpires',
];

/**
 * Recorre toda la respuesta y borra los campos sensibles de cualquier objeto
 * de usuario embebido. Aplicado globalmente (main.ts): ningún endpoint —ni el
 * de hoy ni el que se añada mañana— puede filtrar el hash de la contraseña ni
 * los tokens de reseteo. Antes lo hacían `GET /users`, `GET /users/:id` y
 * `GET /pets` (por la relación `pet.user`).
 */
function scrub(node: any, seen = new Set<any>()): void {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) scrub(item, seen);
    return;
  }

  // Un objeto que tiene 'password' o 'resetPasswordToken' es un usuario.
  if ('password' in node || 'resetPasswordToken' in node) {
    for (const f of SENSITIVE_USER_FIELDS) delete node[f];
  }
  for (const key of Object.keys(node)) {
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
