/**
 * Secreto de firma del JWT.
 *
 * Antes estaba hardcodeado como 'my_key_security' EN EL CÓDIGO, que está en
 * GitHub: con él cualquiera podía fabricar un token de admin válido. Ahora se
 * lee de JWT_SECRET (.env). Se conserva el valor viejo como fallback SÓLO para
 * no invalidar de golpe los tokens ya emitidos; en cuanto JWT_SECRET esté en el
 * server, el fallback deja de aplicarse.
 */
export const jwtConstants = {
  secret: process.env.JWT_SECRET || 'my_key_security',
};
