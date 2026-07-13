import 'dotenv/config';

import { NestFactory, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const logger = new Logger('Bootstrap');

  // Enforce validation rules globally on all incoming requests
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Automatically strips any extra unknown properties from the request body
      forbidNonWhitelisted: true, // Throws an error if unknown properties are sent
      transform: true, // Automatically transforms payloads to be objects typed according to their DTO classes
    }),
  );

  app.enableCors({
    origin: true, // Allow all origins for dev (fixes ngrok CORS errors)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TransformInterceptor(),
  );

  app.setGlobalPrefix('api/v1');

  const port = parseInt(process.env.PORT ?? '1234', 10);
  await app.listen(port);

  logger.log(`🚀 Server running on http://localhost:${port}/api/v1`);
  logger.log(
    `🏥 Health check available at http://localhost:${port}/api/v1/health`,
  );
}

bootstrap();
