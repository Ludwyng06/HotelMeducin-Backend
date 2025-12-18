# Scripts de Migración de Bases de Datos

Scripts para migrar datos de tus bases de datos locales a Docker usando Node.js (sin necesidad de herramientas adicionales como `mongodump`).

## 📋 Requisitos

- Node.js instalado
- Las dependencias del proyecto instaladas (`npm install`)
- Acceso a tus bases de datos locales (MongoDB, Neo4j, Redis)
- Docker corriendo con los contenedores de las bases de datos

## 🚀 Uso Rápido

### Migrar todas las bases de datos

```bash
# 1. Exportar todas las bases de datos locales
node scripts/migrate-all.js export

# 2. Asegúrate de que Docker esté corriendo con los contenedores
docker-compose up -d

# 3. Importar todas las bases de datos a Docker
node scripts/migrate-all.js import
```

### Migrar bases de datos individuales

#### MongoDB

```bash
# Exportar desde MongoDB local
node scripts/migrate-mongodb.js export

# Importar a MongoDB en Docker
node scripts/migrate-mongodb.js import
```

#### Neo4j

```bash
# Exportar desde Neo4j local
node scripts/migrate-neo4j.js export

# Importar a Neo4j en Docker
node scripts/migrate-neo4j.js import
```

#### Redis

```bash
# Exportar desde Redis local
node scripts/migrate-redis.js export

# Importar a Redis en Docker
node scripts/migrate-redis.js import
```

## ⚙️ Configuración

Los scripts usan valores por defecto, pero puedes configurarlos con variables de entorno:

### MongoDB

```bash
# Local
LOCAL_MONGO_URI="mongodb://localhost:27017/hotel_meducin_db" node scripts/migrate-mongodb.js export

# Docker
DOCKER_MONGO_URI="mongodb://localhost:27017/hotel_meducin_db" node scripts/migrate-mongodb.js import
```

### Neo4j

```bash
# Local
LOCAL_NEO4J_URI="bolt://localhost:7687" \
LOCAL_NEO4J_USER="neo4j" \
LOCAL_NEO4J_PASSWORD="tu_password" \
node scripts/migrate-neo4j.js export

# Docker
DOCKER_NEO4J_URI="bolt://localhost:7687" \
DOCKER_NEO4J_USER="neo4j" \
DOCKER_NEO4J_PASSWORD="password" \
node scripts/migrate-neo4j.js import
```

### Redis

```bash
# Local
LOCAL_REDIS_HOST="localhost" \
LOCAL_REDIS_PORT="6379" \
node scripts/migrate-redis.js export

# Docker
DOCKER_REDIS_HOST="localhost" \
DOCKER_REDIS_PORT="6379" \
node scripts/migrate-redis.js import
```

## 📁 Ubicación de Backups

Los backups se guardan en:

- **MongoDB**: `Backend/database/mongodb/backup/`
- **Neo4j**: `Backend/database/neo4j/backup/`
- **Redis**: `Backend/database/redis/backup/`

Los archivos se nombran con timestamp: `{database}-backup-{timestamp}.json`

## 🔄 Proceso de Migración Completo

1. **Preparar Docker**:
   ```bash
   cd Backend
   docker-compose up -d
   ```

2. **Exportar datos locales**:
   ```bash
   node scripts/migrate-all.js export
   ```

3. **Verificar que los contenedores estén corriendo**:
   ```bash
   docker-compose ps
   ```

4. **Importar datos a Docker**:
   ```bash
   node scripts/migrate-all.js import
   ```

5. **Verificar que los datos se importaron correctamente**:
   - MongoDB: Conecta con MongoDB Compass o `mongosh`
   - Neo4j: Abre http://localhost:7474 en tu navegador
   - Redis: Usa `redis-cli` o una herramienta GUI

## ⚠️ Notas Importantes

- **Los scripts de importación LIMPIAN las bases de datos de destino** antes de importar. Si quieres conservar datos existentes, modifica los scripts comentando las líneas que hacen `DELETE` o `FLUSHDB`.

- **MongoDB**: Exporta todas las colecciones excepto las del sistema.

- **Neo4j**: Exporta todos los nodos y relaciones. Los IDs de nodos pueden cambiar durante la importación.

- **Redis**: Exporta todas las claves con sus tipos y TTLs.

- Los scripts son idempotentes: puedes ejecutarlos múltiples veces sin problemas.

## 🐛 Solución de Problemas

### Error de conexión

Verifica que:
- Las bases de datos locales estén corriendo
- Los contenedores de Docker estén corriendo (`docker-compose ps`)
- Las credenciales sean correctas
- Los puertos no estén bloqueados por firewall

### Error "command not found"

Asegúrate de estar en el directorio `Backend/` y que Node.js esté instalado:
```bash
node --version
npm --version
```

### Error de permisos

En Windows, asegúrate de ejecutar PowerShell o Git Bash como administrador si es necesario.

## 📝 Ejemplo Completo

```bash
# 1. Ir al directorio Backend
cd Backend

# 2. Exportar todas las bases de datos
node scripts/migrate-all.js export

# 3. Iniciar Docker
docker-compose up -d

# 4. Esperar a que los contenedores estén listos (healthcheck)
docker-compose ps

# 5. Importar todas las bases de datos
node scripts/migrate-all.js import

# 6. Verificar
# MongoDB
mongosh mongodb://localhost:27017/hotel_meducin_db

# Neo4j
# Abre http://localhost:7474 en tu navegador

# Redis
redis-cli
```
