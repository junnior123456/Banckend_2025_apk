import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // Escuchar en todas las interfaces para permitir conexiones desde emuladores
  await app.listen(process.env.PORT || 3000, '0.0.0.0');
  console.log('🚀 Backend corriendo en http://0.0.0.0:3000');
}
bootstrap();
