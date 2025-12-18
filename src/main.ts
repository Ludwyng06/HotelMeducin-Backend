import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ErrorInterceptor } from './common/interceptors/error.interceptor';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfigService } from '@nestjs/config';
import { getSSLConfig } from './config/ssl.config';
import express from 'express';
import * as http from 'http';

async function bootstrap() {
  const configService = new ConfigService();
  const sslConfig = getSSLConfig(configService);
  
  // 🔐 Crear aplicación con opciones HTTPS si está habilitado
  const appOptions: any = {};
  if (sslConfig.httpsEnabled && sslConfig.key && sslConfig.cert) {
    appOptions.httpsOptions = {
      key: sslConfig.key,
      cert: sslConfig.cert,
    };
  }
  
  const app = await NestFactory.create(AppModule, appOptions);
  
  // 🔌 Configurar WebSocket Adapter (sin pasar app, NestJS lo maneja automáticamente)
  app.useWebSocketAdapter(new IoAdapter());
  
  // 🌐 CONFIGURAR CORS PRIMERO (antes de otros middlewares)
  const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
  const frontendUrlHttps = frontendUrl.replace('http://', 'https://');
  
  // Middleware manual para CORS (PRIMERO, antes de cualquier otro middleware)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // SIEMPRE agregar headers CORS para desarrollo local
    // Permitir cualquier localhost
    if (!origin || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1') || 
        origin.includes('::1') ||
        origin === frontendUrl ||
        origin === frontendUrlHttps) {
      
      // Si hay origin, usar ese origin específico (requerido por navegadores con credentials)
      // Si no hay origin (Postman, curl), usar *
      const allowOrigin = origin || '*';
      
      res.setHeader('Access-Control-Allow-Origin', allowOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization');
      res.setHeader('Vary', 'Origin');
      
      // Manejar preflight OPTIONS requests
      if (req.method === 'OPTIONS') {
        console.log('🔄 OPTIONS preflight desde:', origin);
        return res.status(204).end();
      }
    }
    
    next();
  });
  
  // Configuración de CORS adicional con NestJS
  app.enableCors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (Postman, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // Permitir cualquier localhost en desarrollo
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('::1')) {
        return callback(null, true);
      }
      
      const allowedOrigins = [
        'http://localhost:4200', 
        'http://localhost:3001', 
        'http://localhost:3000',
        'https://localhost:4200',
        'https://localhost:3001',
        'https://localhost:3000',
        frontendUrl,
        frontendUrlHttps,
      ];
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS bloqueado para origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  
  // 🛡️ CONFIGURACIÓN DE SEGURIDAD Y LÍMITES
  
  // Configurar límites de tamaño de peticiones (evitar desbordamiento)
  app.use(express.json({ limit: '10mb' })); // Máximo 10MB para JSON
  app.use(express.urlencoded({ limit: '10mb', extended: true })); // Máximo 10MB para URL encoded

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

  const port = configService.get<number>('PORT') || 3000;
  const httpsPort = configService.get<number>('HTTPS_PORT') || 3443;

  // 🔐 CONFIGURACIÓN HTTPS
  if (sslConfig.httpsEnabled && sslConfig.key && sslConfig.cert) {
    // Iniciar servidor HTTPS
    await app.listen(httpsPort);
    
    console.log(`🔒 Backend Hotel Meducin ejecutándose en HTTPS: https://localhost:${httpsPort}`);
    console.log(`🌐 CORS configurado para: ${frontendUrl} y ${frontendUrlHttps}`);
    console.log(`🔌 WebSocket Gateway activo en /notifications`);
    console.log(`🛡️ Límites de petición: 10MB`);
    console.log(`⏱️ Timeout de operaciones: 30 segundos`);
    console.log(`🔍 Validación estricta activada`);
    console.log(`🔐 SSL/HTTPS habilitado con certificado autofirmado`);
    
    // Redirigir HTTP a HTTPS (servidor HTTP separado en puerto estándar)
    const httpApp = express();
    httpApp.use((req, res) => {
      const httpsUrl = `https://${req.headers.host?.replace(`:${port}`, `:${httpsPort}`)}${req.url}`;
      return res.redirect(301, httpsUrl);
    });

    http.createServer(httpApp).listen(port, () => {
      console.log(`🔄 Redirección HTTP → HTTPS activa en http://localhost:${port}`);
      console.log(`   Todas las peticiones HTTP serán redirigidas a HTTPS`);
    });
  } else {
    // Modo HTTP normal (sin HTTPS)
    await app.listen(port);
    
    console.log(`🚀 Backend Hotel Meducin ejecutándose en HTTP: http://localhost:${port}`);
    console.log(`⚠️  HTTPS deshabilitado. Para habilitarlo, configura HTTPS_ENABLED=true y certificados SSL`);
    console.log(`🌐 CORS configurado para: ${frontendUrl}`);
    console.log(`🔌 WebSocket Gateway activo en /notifications`);
    console.log(`🛡️ Límites de petición: 10MB`);
    console.log(`⏱️ Timeout de operaciones: 30 segundos`);
    console.log(`🔍 Validación estricta activada`);
  }
}
bootstrap();
