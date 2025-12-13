import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ErrorInterceptor } from './common/interceptors/error.interceptor';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 🛡️ CONFIGURACIÓN DE SEGURIDAD Y LÍMITES
  
  // Configurar límites de tamaño de peticiones (evitar desbordamiento)
  app.use(express.json({ limit: '10mb' })); // Máximo 10MB para JSON
  app.use(express.urlencoded({ limit: '10mb', extended: true })); // Máximo 10MB para URL encoded
  
  // Configurar CORS para el frontend
  app.enableCors({
    origin: ['http://localhost:4200', 'http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 🔍 Configurar validación global (más estricta)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Eliminar propiedades no definidas en DTOs
    forbidNonWhitelisted: true, // Lanzar error si hay propiedades no permitidas
    transform: true, // Transformar automáticamente tipos
    transformOptions: {
      enableImplicitConversion: true, // Conversión implícita de tipos
    },
    validationError: {
      target: false, // No exponer el objeto objetivo completo
      value: false, // No exponer el valor
    },
    exceptionFactory: (errors) => {
      // Personalizar mensajes de error de validación
      const messages = errors.map(error => ({
        field: error.property,
        constraints: error.constraints,
        value: error.value,
      }));
      return new BadRequestException({
        message: 'Error de validación en los datos enviados',
        errors: messages,
      });
    },
  }));

  // 🔒 Configurar filtros globales de errores
  app.useGlobalFilters(new HttpExceptionFilter());

  // 📊 Configurar interceptores globales
  app.useGlobalInterceptors(
    new ErrorInterceptor(), // Manejo de errores y timeouts
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Responder a /favicon.ico para evitar 404 de los navegadores
  app.getHttpAdapter().get('/favicon.ico', (_req, res) => {
    res.status(204).send();
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Backend Hotel Meducin ejecutándose en http://localhost:${port}`);
  console.log(`🌐 CORS configurado para: ${process.env.FRONTEND_URL || 'http://localhost:4200'}`);
  console.log(`🛡️ Límites de petición: 10MB`);
  console.log(`⏱️ Timeout de operaciones: 30 segundos`);
  console.log(`🔍 Validación estricta activada`);
}
bootstrap();
