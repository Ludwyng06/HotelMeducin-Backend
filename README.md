# 🏨 Hotel Meducin - Backend API

## 📋 Descripción del Proyecto

Sistema backend para la gestión integral del Hotel Meducin, desarrollado con **NestJS**, **MongoDB** y **Redis**. Implementa autenticación JWT, gestión de reservaciones, habitaciones y servicios del hotel.

## 🛠️ Tecnologías Utilizadas

- **NestJS** - Framework de Node.js
- **MongoDB** - Base de datos NoSQL
- **Redis** - Cache y sesiones
- **TypeScript** - Lenguaje de programación
- **JWT** - Autenticación
- **Mongoose** - ODM para MongoDB

## 📦 Instalación y Dependencias

### Prerrequisitos
- Node.js (v18 o superior)
- MongoDB (v5 o superior)
- Redis (v6 o superior)

### Instalación de Dependencias

```bash
# Instalar dependencias del proyecto
npm install

# Instalar dependencias globales (opcional)
npm install -g @nestjs/cli
```

### Dependencias Principales
```json
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0",
  "@nestjs/mongoose": "^10.0.0",
  "@nestjs/jwt": "^10.0.0",
  "@nestjs/passport": "^10.0.0",
  "mongoose": "^7.0.0",
  "redis": "^4.0.0",
  "passport": "^0.6.0",
  "passport-jwt": "^4.0.0"
}
```

## 🚀 Comandos para Ejecutar el Servidor

### Desarrollo
```bash
# Ejecutar en modo desarrollo
npm run start:dev

# Ejecutar con hot reload
npm run start:debug
```

### Producción
```bash
# Compilar el proyecto
npm run build

# Ejecutar en producción
npm run start:prod
```

### Otros Comandos
```bash
# Ejecutar tests
npm run test

# Ejecutar tests e2e
npm run test:e2e

# Linting
npm run lint
```

## 🗄️ Configuración de Base de Datos

### MongoDB
```bash
# Iniciar MongoDB (Windows)
mongod

# Iniciar MongoDB (Linux/Mac)
sudo systemctl start mongod

# Conectar a MongoDB
mongosh
```

### Redis
```bash
# Iniciar Redis (Windows)
redis-server

# Iniciar Redis (Linux/Mac)
sudo systemctl start redis
```

### Variables de Entorno
Crear archivo `.env` en la raíz del proyecto:

```env
# Base de datos
MONGODB_URI=mongodb://localhost:27017/hotel_meducin_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=tu_jwt_secret_aqui
JWT_EXPIRES_IN=24h

# Puerto del servidor
PORT=3000
```

## 📡 Endpoints de la API

### 🔐 Autenticación
```
POST   /auth/login          # Iniciar sesión
POST   /auth/register       # Registro de usuario
GET    /auth/profile        # Obtener perfil del usuario
PUT    /auth/profile        # Actualizar perfil
```

### 👥 Usuarios
```
GET    /users              # Obtener todos los usuarios
GET    /users/:id          # Obtener usuario por ID
PUT    /users/:id          # Actualizar usuario
DELETE /users/:id          # Eliminar usuario
```

### 🏠 Habitaciones
```
GET    /rooms              # Obtener todas las habitaciones
GET    /rooms/:id          # Obtener habitación por ID
POST   /rooms              # Crear habitación
PUT    /rooms/:id          # Actualizar habitación
DELETE /rooms/:id          # Eliminar habitación
GET    /rooms/category/:id # Obtener habitaciones por categoría
```

### 🏷️ Categorías de Habitaciones
```
GET    /room-categories           # Obtener todas las categorías
GET    /room-categories/:id       # Obtener categoría por ID
GET    /room-categories/stats     # Estadísticas de categorías
```

### 🛎️ Reservaciones
```
GET    /reservations                    # Obtener todas las reservaciones
POST   /reservations                    # Crear reservación
GET    /reservations/:id               # Obtener reservación por ID
PUT    /reservations/:id               # Actualizar reservación
DELETE /reservations/:id               # Eliminar reservación
GET    /reservations/user              # Obtener reservaciones del usuario
GET    /reservations/room/:roomId/occupied-dates # Fechas ocupadas de habitación
```

### 🏊 Servicios del Hotel
```
GET    /services              # Obtener todos los servicios
GET    /services/:id          # Obtener servicio por ID
POST   /services              # Crear servicio
PUT    /services/:id          # Actualizar servicio
DELETE /services/:id          # Eliminar servicio
```

### 📊 Reportes
```
GET    /reports/occupancy     # Reporte de ocupación
GET    /reports/revenue       # Reporte de ingresos
GET    /reports/guests        # Reporte de huéspedes
```

## 🔧 Arquitectura del Proyecto (Patrón MVC)

El backend sigue el patrón **Modelo-Vista-Controlador (MVC)** adaptado para NestJS:

```
src/
├── models/                       # 📦 MODELS - Esquemas y DTOs
│   ├── auth/                     # DTOs de autenticación (login, register)
│   ├── document-types/           # Schema + DTOs de tipos de documento
│   ├── guests/                   # Schema + DTOs de huéspedes
│   ├── reservations/             # Schema + DTOs de reservaciones
│   ├── reservation-drafts/       # Schema + DTOs de borradores
│   ├── rooms/                    # Schema + DTOs de habitaciones y categorías
│   ├── services/                 # Schema + DTOs de servicios del hotel
│   └── users/                    # Schema + DTOs de usuarios y roles
│
├── controllers/                  # 🎮 CONTROLLERS - Endpoints HTTP
│   ├── auth.controller.ts        # Autenticación y registro
│   ├── users.controller.ts       # Gestión de usuarios
│   ├── superadmin.controller.ts  # Gestión de administradores
│   ├── rooms.controller.ts       # Gestión de habitaciones
│   ├── room-category.controller.ts # Categorías de habitaciones
│   ├── reservations.controller.ts  # Reservaciones
│   ├── reservation-drafts.controller.ts # Borradores de reservas
│   ├── guests.controller.ts      # Gestión de huéspedes
│   ├── services.controller.ts    # Servicios del hotel
│   ├── document-types.controller.ts # Tipos de documento
│   ├── reports.controller.ts     # Reportes generales
│   ├── hotel-metrics.controller.ts # Métricas del hotel
│   ├── pdf.controller.ts         # Generación de PDFs
│   ├── cache.controller.ts       # Gestión de caché
│   ├── redis-test.controller.ts  # Testing de Redis
│   ├── redis-advanced.controller.ts # Redis avanzado
│   └── redis-dashboard.controller.ts # Dashboard de Redis
│
├── services/                     # 🔧 SERVICES - Lógica de negocio
│   ├── auth.service.ts           # Lógica de autenticación
│   ├── users.service.ts          # Lógica de usuarios
│   ├── user-roles.service.ts     # Gestión de roles
│   ├── rooms.service.ts          # Lógica de habitaciones
│   ├── room-category.service.ts  # Lógica de categorías
│   ├── reservations.service.ts   # Lógica de reservaciones
│   ├── reservation-drafts.service.ts # Borradores
│   ├── guests.service.ts         # Lógica de huéspedes
│   ├── services.service.ts       # Servicios del hotel
│   ├── document-types.service.ts # Tipos de documento
│   ├── reports.service.ts        # Generación de reportes
│   ├── pdf.service.ts            # Generación de PDFs
│   ├── email.service.ts          # Envío de emails
│   └── cache.service.ts          # Gestión de caché
│
├── modules/                      # 📦 MODULES - Módulos de NestJS
│   ├── auth/                     # Módulo de autenticación + JWT Strategy
│   ├── users/                    # Módulo de usuarios
│   ├── rooms/                    # Módulo de habitaciones
│   ├── reservations/             # Módulo de reservaciones
│   ├── reservation-drafts/       # Módulo de borradores
│   ├── guests/                   # Módulo de huéspedes
│   ├── services/                 # Módulo de servicios
│   ├── document-types/           # Módulo de tipos de documento
│   ├── reports/                  # Módulo de reportes
│   ├── pdf/                      # Módulo de PDFs
│   ├── redis-cache/              # Módulo de caché Redis
│   ├── redis-advanced/           # Redis avanzado
│   ├── redis-dashboard/          # Dashboard Redis
│   └── redis-test/               # Testing Redis
│
├── common/                       # 🛡️ COMMON - Componentes compartidos
│   ├── decorators/               # Decoradores personalizados (roles, etc.)
│   ├── filters/                  # Filtros de excepciones HTTP
│   ├── guards/                   # Guards (JWT, Roles)
│   └── interceptors/             # Interceptores (logging, transform)
│
├── config/                       # ⚙️ CONFIG - Configuraciones
│   ├── mongodb.config.ts         # Configuración de MongoDB
│   ├── redis.config.ts           # Configuración de Redis
│   ├── redis.service.ts          # Servicio de Redis
│   └── jwt.config.ts             # Configuración de JWT
│
├── views/                        # 👁️ VIEWS - (Vacío - API REST no usa vistas)
├── app.module.ts                 # Módulo principal de la aplicación
└── main.ts                       # Punto de entrada de la aplicación
```

### 📊 Resumen de Componentes MVC

#### **17 Controladores** (Controllers)
Manejan las peticiones HTTP y delegan la lógica a los servicios:
- Autenticación y Usuarios (3): `auth`, `users`, `superadmin`
- Habitaciones (2): `rooms`, `room-category`
- Reservaciones (3): `reservations`, `reservation-drafts`, `guests`
- Servicios del Hotel (2): `services`, `document-types`
- Reportes y Métricas (3): `reports`, `hotel-metrics`, `pdf`
- Redis y Caché (6): `cache`, `redis-test`, `redis-advanced`, `redis-dashboard`

#### **14 Servicios** (Services)
Contienen la lógica de negocio y se comunican con la base de datos:
- Autenticación y Usuarios: `auth`, `users`, `user-roles`
- Habitaciones: `rooms`, `room-category`
- Reservaciones: `reservations`, `reservation-drafts`, `guests`
- Servicios del Hotel: `services`, `document-types`
- Reportes y Utilidades: `reports`, `pdf`, `email`, `cache`

#### **8 Modelos** (Models)
Esquemas de MongoDB + DTOs para validación:
- `auth` (DTOs), `users` (Schema + DTOs), `rooms` (Schema + DTOs)
- `reservations` (Schema + DTOs), `reservation-drafts` (Schema + DTOs)
- `guests` (Schema + DTOs), `services` (Schema + DTOs)
- `document-types` (Schema + DTOs)

#### **14 Módulos** (NestJS Modules)
Encapsulan la funcionalidad y dependencias de cada feature.

---

## 🏗️ Flujo de Datos MVC en el Backend

```
Cliente HTTP
    ↓
┌─────────────────────────────────────────────────────┐
│  1. CONTROLLER (Capa de Presentación)              │
│     - Recibe peticiones HTTP                        │
│     - Valida datos con DTOs                         │
│     - Delega lógica al Service                      │
│     - Retorna respuestas HTTP                       │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│  2. SERVICE (Lógica de Negocio)                    │
│     - Procesa la lógica de negocio                  │
│     - Valida reglas de negocio                      │
│     - Interactúa con MongoDB usando Models          │
│     - Maneja transacciones y caché                  │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│  3. MODEL (Esquemas + DTOs)                        │
│     - Define estructura de datos (Schemas)          │
│     - Valida tipos con DTOs                         │
│     - Mapea a colecciones de MongoDB                │
└─────────────────────────────────────────────────────┘
    ↓
MongoDB / Redis
```

### Ejemplo de Flujo: Crear una Reservación

1. **Controller** (`reservations.controller.ts`):
   ```typescript
   @Post()
   create(@Body() createDto: CreateReservationDto) {
     return this.reservationsService.create(createDto);
   }
   ```

2. **Service** (`reservations.service.ts`):
   ```typescript
   async create(createDto: CreateReservationDto) {
     // Validar disponibilidad de habitación
     // Calcular precio total
     // Crear reservación en MongoDB
     return await this.reservationModel.create(createDto);
   }
   ```

3. **Model** (`reservation.schema.ts` + `create-reservation.dto.ts`):
   ```typescript
   @Schema()
   export class Reservation {
     @Prop({ required: true })
     userId: string;
     
     @Prop({ required: true })
     roomId: string;
     // ... más campos
   }
   ```

---

## 🚀 Inicio Rápido

1. **Clonar el repositorio**
2. **Instalar dependencias**: `npm install`
3. **Configurar variables de entorno** en `.env`
4. **Iniciar MongoDB y Redis**
5. **Ejecutar el servidor**: `npm run start:dev`
6. **Acceder a**: `http://localhost:3000`

## 📝 Notas Importantes

### ⚙️ Configuración
- El servidor se ejecuta en el puerto **3000** por defecto
- La base de datos se conecta a **MongoDB** en `localhost:27017`
- **Redis** se usa para cache y sesiones en el puerto **6379**

### 🔐 Seguridad
- Todas las rutas requieren autenticación JWT excepto `/auth/login` y `/auth/register`
- Los Guards protegen rutas según roles: `user`, `admin`, `superadmin`
- Las contraseñas se encriptan con **bcrypt**
- Tokens JWT con expiración de **24 horas**

### 🏗️ Arquitectura MVC
- **17 Controladores** manejan las peticiones HTTP
- **14 Servicios** contienen toda la lógica de negocio
- **8 Modelos** definen esquemas de MongoDB y DTOs de validación
- **14 Módulos** encapsulan features completas
- **Separación clara** entre capas: Controller → Service → Model → Database

### 📊 Base de Datos
- **MongoDB** como base de datos principal
- **Redis** para caché de sesiones y datos frecuentes
- **Mongoose** como ODM para interactuar con MongoDB
- Esquemas definidos con decoradores de Mongoose

### 🔄 Flujo de Trabajo
```
HTTP Request → Guards → Controller → DTO Validation → Service → Model → MongoDB
                  ↓                                        ↓
              Interceptors                             Redis Cache
```