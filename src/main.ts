import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Eliminar campos no definidos en DTOs
      forbidNonWhitelisted: true, // Rechazar peticiones con campos no definidos en DTOs
      transform: true, // Habilitar la transformación de datos recibidos
    }),
  );

  app.enableCors({
    origin: 'http://localhost:4321',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
  });

  // Middleware para parsear cookies
  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
