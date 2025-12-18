# 📋 Instrucciones de Migración - Tu Configuración

Basado en tu archivo `.env`, aquí están los comandos exactos que necesitas ejecutar:

## 🔧 Tu Configuración Actual

- **MongoDB**: `mongodb://localhost:27017/hotel_meducin_db`
- **Redis**: `localhost:6379`
- **Neo4j Local**: `bolt://localhost:7687` (usuario: `neo4j`, contraseña: `12345678`)
- **Neo4j Docker**: `bolt://localhost:7687` (usuario: `neo4j`, contraseña: `password`)

## 🚀 Pasos para Migrar

### 1. Exportar datos locales

Desde el directorio `Backend/`, ejecuta:

```bash
# Exportar todas las bases de datos
node scripts/migrate-all.js export
```

O individualmente:

```bash
# MongoDB
node scripts/migrate-mongodb.js export

# Neo4j (usará tu contraseña local: 12345678)
node scripts/migrate-neo4j.js export

# Redis
node scripts/migrate-redis.js export
```

### 2. Iniciar Docker

```bash
cd Backend
docker-compose up -d
```

Espera a que todos los contenedores estén saludables:
```bash
docker-compose ps
```

### 3. Importar datos a Docker

```bash
# Importar todas las bases de datos
node scripts/migrate-all.js import
```

O individualmente:

```bash
# MongoDB
node scripts/migrate-mongodb.js import

# Neo4j (usará contraseña de Docker: password)
node scripts/migrate-neo4j.js import

# Redis
node scripts/migrate-redis.js import
```

## ⚙️ Si necesitas cambiar la configuración

### Para Neo4j local (si tu contraseña es diferente):

```bash
LOCAL_NEO4J_PASSWORD="tu_password_local" node scripts/migrate-neo4j.js export
```

### Para Neo4j en Docker (si cambiaste la contraseña en docker-compose.yml):

```bash
DOCKER_NEO4J_PASSWORD="tu_password_docker" node scripts/migrate-neo4j.js import
```

## 📝 Comandos Completos (Copy-Paste)

```bash
# 1. Ir al directorio Backend
cd Backend

# 2. Exportar todas las bases de datos locales
node scripts/migrate-all.js export

# 3. Iniciar Docker
docker-compose up -d

# 4. Esperar a que los contenedores estén listos (verifica con docker-compose ps)
docker-compose ps

# 5. Importar todas las bases de datos a Docker
node scripts/migrate-all.js import

# 6. Verificar que todo funcionó
# MongoDB: mongosh mongodb://localhost:27017/hotel_meducin_db
# Neo4j: Abre http://localhost:7474 en tu navegador
# Redis: redis-cli
```

## ⚠️ Notas Importantes

1. **Neo4j**: Tu contraseña local es `12345678`, pero en Docker será `password` (según docker-compose.yml). Los scripts ya están configurados para esto.

2. **Los scripts LIMPIAN las bases de datos de destino** antes de importar. Si quieres conservar datos existentes en Docker, modifica los scripts comentando las líneas de limpieza.

3. **Backups**: Los archivos de backup se guardan en:
   - `Backend/database/mongodb/backup/`
   - `Backend/database/neo4j/backup/`
   - `Backend/database/redis/backup/`

4. **Verificación**: Después de importar, verifica que los datos estén correctos antes de eliminar tus bases de datos locales.

## 🐛 Solución de Problemas

### Error de conexión a Neo4j local

Si tu contraseña de Neo4j local es diferente a `12345678`:

```bash
LOCAL_NEO4J_PASSWORD="tu_password_real" node scripts/migrate-neo4j.js export
```

### Error de conexión a MongoDB

Verifica que MongoDB local esté corriendo:
```bash
# Windows
net start MongoDB

# O verifica el proceso
tasklist | findstr mongod
```

### Error de conexión a Redis

Verifica que Redis local esté corriendo:
```bash
redis-cli ping
# Debe responder: PONG
```
