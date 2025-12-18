# 🔐 Configuración HTTPS para Desarrollo Local

Esta guía te ayudará a configurar HTTPS en tu entorno de desarrollo local usando certificados confiables generados con `mkcert`.

## 📋 Requisitos Previos

1. **mkcert** instalado en tu sistema
2. Node.js y npm funcionando
3. Backend y Frontend configurados

## 🚀 Pasos de Configuración

### Paso 1: Instalar mkcert

**Windows (con Chocolatey):**
```powershell
choco install mkcert
```

**Windows (con Scoop):**
```powershell
scoop install mkcert
```

**Windows (manual):**
1. Descarga desde: https://github.com/FiloSottile/mkcert/releases
2. Descarga `mkcert-v1.4.4-windows-amd64.exe`
3. Renómbralo a `mkcert.exe` y colócalo en una carpeta del PATH

### Paso 2: Instalar la Autoridad Certificadora Local

```powershell
mkcert -install
```

Esto instalará una CA local que tu navegador confiará automáticamente. **Solo necesitas hacerlo una vez.**

### Paso 3: Generar Certificados SSL

```powershell
cd Backend
mkdir certs -ErrorAction SilentlyContinue
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 ::1
```

Esto generará:
- `Backend/certs/key.pem` - Clave privada
- `Backend/certs/cert.pem` - Certificado

### Paso 4: Configurar Variables de Entorno

Crea o actualiza `Backend/.env`:

```env
HTTPS_ENABLED=true
SSL_CERT_PATH=./certs/cert.pem
SSL_KEY_PATH=./certs/key.pem
HTTPS_PORT=3443
FRONTEND_URL=https://localhost:4200
```

### Paso 5: Ejecutar los Servicios

**Terminal 1 - Backend:**
```powershell
cd Backend
npm run start:dev
```

Deberías ver:
```
🔒 Backend Hotel Meducin ejecutándose en HTTPS: https://localhost:3443
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

Deberías ver:
```
> ✅ Servidor HTTPS listo en https://localhost:4200
> 🔒 Certificado SSL válido (sin advertencias del navegador)
```

## ✅ Verificación

1. Abre tu navegador y ve a: `https://localhost:4200`
2. Deberías ver el **candado verde** 🔒 sin advertencias
3. El backend debería estar disponible en: `https://localhost:3443`

## 🔄 Volver a HTTP (si es necesario)

Si necesitas volver a HTTP temporalmente:

**Backend:**
- Cambia `HTTPS_ENABLED=false` en `Backend/.env`
- O simplemente no configures las variables HTTPS

**Frontend:**
- Usa `npm run dev:http` en lugar de `npm run dev`

## ⚠️ Notas Importantes

- Los certificados generados con `mkcert` son **solo para desarrollo local**
- No uses estos certificados en producción
- Los certificados son válidos para `localhost`, `127.0.0.1` y `::1`
- Si cambias de máquina, necesitarás regenerar los certificados

## 🐛 Solución de Problemas

### Error: "No se encontraron los certificados SSL"

Asegúrate de que los certificados estén en:
- `Backend/certs/cert.pem`
- `Backend/certs/key.pem`

### Error: "ERR_CERT_AUTHORITY_INVALID"

1. Verifica que ejecutaste `mkcert -install`
2. Reinicia tu navegador
3. Asegúrate de usar `localhost` y no el hostname de tu sistema

### El frontend no puede conectarse al backend

Verifica que:
1. El backend esté corriendo en `https://localhost:3443`
2. Las variables de entorno en `frontend/next.config.ts` apunten a HTTPS
3. No haya errores de CORS (el backend debe tener `FRONTEND_URL=https://localhost:4200`)

## 📚 Referencias

- [mkcert GitHub](https://github.com/FiloSottile/mkcert)
- [Next.js Custom Server](https://nextjs.org/docs/pages/api-reference/next-server)

