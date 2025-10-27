import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar Express para manejar UTF-8 correctamente
  app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });

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

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API Clínica Perú')
    .setDescription(
      'Documentación completa de los endpoints del sistema médico',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa el token JWT',
        in: 'header',
      },
      'bearerAuth',
    )
    .addCookieAuth(
      'Authentication',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'token',
        description: 'Autenticación basada en cookies',
      },
      'cookieAuth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'API Clínica - Documentación',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  /*
   * INSTRUCCIONES PARA USAR SWAGGER:
   *
   * 1. Accede a la documentación en: http://localhost:3000/api/docs
   *
   * 2. AUTENTICACIÓN JWT (Bearer Token):
   *    - Haz clic en "Authorize" (candado verde)
   *    - En "bearerAuth", ingresa: Bearer tu_token_jwt_aqui
   *    - Ejemplo: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   *
   * 3. AUTENTICACIÓN POR COOKIES:
   *    - Haz clic en "Authorize" (candado verde)
   *    - En "cookieAuth", ingresa el valor de la cookie Authentication
   *    - Ejemplo: tu_valor_cookie_aqui
   *
   * 4. PROBAR ENDPOINTS:
   *    - Los endpoints públicos no requieren autenticación
   *    - Los endpoints protegidos mostrarán un candado
   *    - Usa "Try it out" para probar cada endpoint
   *
   * 5. ORGANIZACIÓN:
   *    - Los endpoints están organizados por módulos (tags)
   *    - Usa el filtro para buscar endpoints específicos
   */

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
