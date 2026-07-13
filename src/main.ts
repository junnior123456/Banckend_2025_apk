// PRIMERA línea a propósito: DATABASE_URL se lee al importar app.module, así que
// el .env tiene que estar cargado antes. Antes esto se hacía con `node -r
// dotenv/config`, pero pm2 NO propaga --node-args a los workers en modo cluster:
// el .env no se cargaba, TypeORM se iba a la rama de MySQL y el proceso moría
// en silencio. Cargándolo aquí, la app arranca igual en fork que en cluster.
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SanitizeUserInterceptor } from './common/sanitize-user.interceptor';
import helmet from 'helmet';

/**
 * Orígenes web autorizados (build web / panel), vía CORS_ORIGINS separados por
 * coma. La APK Android no envía cabecera Origin, así que no depende de esta lista.
 */
function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // nginx es el único que habla con Node. Sin trust proxy, req.ip sería siempre
  // 127.0.0.1 y el rate limiting trataría a todos los usuarios como uno solo.
  const express = app.getHttpAdapter().getInstance();
  express.set('trust proxy', 1);
  express.disable('x-powered-by');

  app.use(
    helmet({
      // La API sólo devuelve JSON: ningún origen debe poder ejecutar,
      // incrustar ni cargar nada a partir de una respuesta suya.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      // HSTS lo pone nginx en el bloque 443 (y sólo ahí, que es donde tiene
      // sentido). Aquí se desactiva para no emitir la cabecera por duplicado.
      hsts: false,
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );

  app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), camera=(), microphone=(), payment=(), usb=()',
    );
    // Datos personales y expedientes clínicos: que ningún intermediario cachee.
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Prefijo global para la APK: http://<host>/api/...
  app.setGlobalPrefix('api');

  const origins = allowedOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      // Sin Origin = cliente no-navegador (la APK, curl, Postman). CORS no
      // aplica ahí; a esos clientes los frenan el JWT y el rate limiting.
      if (!origin) return callback(null, true);
      if (origins.includes(origin)) return callback(null, true);
      // Rechazo limpio: se responde SIN la cabecera Access-Control-Allow-Origin
      // y el navegador bloquea la respuesta. Lanzar un Error aquí daría un 500,
      // que ensucia los logs y convierte un rechazo esperado en una avería.
      return callback(null, false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Nunca dejar salir password/tokens del usuario en ninguna respuesta.
  app.useGlobalInterceptors(new SanitizeUserInterceptor());

  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  const host = '0.0.0.0';

  await app.listen(port, host);

  const log = new Logger('Bootstrap');
  log.log(`🚀 Backend corriendo en http://${host}:${port}`);
  log.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  log.log(
    `🔒 CORS: ${origins.length ? origins.join(', ') : 'sin orígenes web (sólo clientes nativos)'}`,
  );
  log.log(`👷 Instancia pm2: ${process.env.NODE_APP_INSTANCE ?? 'única'}`);
}

bootstrap().catch((err) => {
  console.error('❌ Error al iniciar la aplicación:', err);
  process.exit(1);
});
