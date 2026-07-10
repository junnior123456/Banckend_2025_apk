import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SanitizeUserInterceptor } from './common/sanitize-user.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Configurar UTF-8 para caracteres especiales
  app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });

  // Prefijo global para tu APK: http://<host>:<port>/api/...
  app.setGlobalPrefix('api');

  // CORS abierto para Flutter (app y web)
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // Nunca dejar salir password/tokens del usuario en ninguna respuesta.
  app.useGlobalInterceptors(new SanitizeUserInterceptor());

  // Escuchar en todas las interfaces para permitir conexiones desde emuladores
  const port = process.env.PORT || 3000;
  const host = '0.0.0.0';
  
  await app.listen(port, host);
  
  console.log(`🚀 Backend corriendo en http://${host}:${port}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Port: ${port}`);
}

bootstrap().catch((err) => {
  console.error('❌ Error al iniciar la aplicación:', err);
  process.exit(1);
});
