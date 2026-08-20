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
 * Datos de contacto de la CUENTA. No son secretos como una contraseña, pero
 * tampoco son públicos: el autor de una publicación eligió qué teléfono y qué
 * correo enseñar en los campos `contactPhone`/`contactEmail` de la mascota.
 * El correo con el que se registró es otra cosa.
 *
 * 🔒 En la auditoría del 20-ago-2026 se comprobó que `GET /pets`, que es
 * público, devolvía `pet.user` entero: correo, teléfono y dirección de
 * cualquier persona que hubiera publicado, sin necesidad de estar registrado.
 */
const PRIVATE_CONTACT_FIELDS = ['email', 'phone', 'address', 'lastLoginAt'];

/**
 * ¿Este objeto es una publicación o un comentario? Se mira por sus campos
 * propios en vez de por el nombre de la clase, que TypeORM ya perdió al
 * serializar. Solo en esos casos se recorta el autor: en el login la respuesta
 * también trae un `user`, pero ahí es el PROPIO usuario y necesita su correo.
 */
function esPublicacionOComentario(node: any): boolean {
  return (
    'petId' in node ||
    'breed' in node ||
    'categoryId' in node ||
    'isRisk' in node
  );
}

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

  // El autor embebido en una publicación o comentario se recorta a lo público.
  if (esPublicacionOComentario(node) && node.user && typeof node.user === 'object') {
    for (const f of PRIVATE_CONTACT_FIELDS) delete node.user[f];
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
