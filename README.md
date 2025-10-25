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

## 🔧 Estructura del Proyecto

```
src/
├── modules/
│   ├── auth/              # Autenticación JWT
│   ├── users/             # Gestión de usuarios
│   ├── rooms/             # Gestión de habitaciones
│   ├── reservations/      # Sistema de reservaciones
│   ├── services/          # Servicios del hotel
│   └── reports/           # Reportes analíticos
├── common/
│   ├── filters/           # Filtros globales
│   ├── interceptors/      # Interceptores
│   ├── guards/            # Guards de seguridad
│   └── decorators/        # Decoradores personalizados
├── config/                # Configuraciones
└── main.ts               # Punto de entrada
```

## 🚀 Inicio Rápido

1. **Clonar el repositorio**
2. **Instalar dependencias**: `npm install`
3. **Configurar variables de entorno** en `.env`
4. **Iniciar MongoDB y Redis**
5. **Ejecutar el servidor**: `npm run start:dev`
6. **Acceder a**: `http://localhost:3000`

## 📝 Notas Importantes

- El servidor se ejecuta en el puerto **3000** por defecto
- La base de datos se conecta a **MongoDB** en `localhost:27017`
- **Redis** se usa para cache y sesiones
- Todas las rutas requieren autenticación JWT excepto `/auth/login` y `/auth/register`