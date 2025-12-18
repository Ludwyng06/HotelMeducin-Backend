#!/bin/bash

# Script Bash para verificar configuración SSL/HTTPS

echo "🔍 Verificando configuración SSL/HTTPS..."
echo ""

# Verificar si existe el directorio de certificados
if [ ! -d "certs" ]; then
    echo "❌ Directorio 'certs' no existe"
    echo "   Ejecuta: ./scripts/generate-ssl-cert.sh"
    exit 1
fi

# Verificar certificado
CERT_PATH="certs/cert.pem"
KEY_PATH="certs/key.pem"

echo "📁 Certificados:"
if [ -f "$CERT_PATH" ]; then
    CERT_SIZE=$(stat -f%z "$CERT_PATH" 2>/dev/null || stat -c%s "$CERT_PATH" 2>/dev/null || echo "0")
    echo "   ✅ cert.pem existe ($CERT_SIZE bytes)"
else
    echo "   ❌ cert.pem NO existe"
fi

if [ -f "$KEY_PATH" ]; then
    KEY_SIZE=$(stat -f%z "$KEY_PATH" 2>/dev/null || stat -c%s "$KEY_PATH" 2>/dev/null || echo "0")
    echo "   ✅ key.pem existe ($KEY_SIZE bytes)"
else
    echo "   ❌ key.pem NO existe"
fi

echo ""

# Verificar variables de entorno
echo "⚙️  Variables de entorno:"

if [ -f ".env" ]; then
    if grep -q "HTTPS_ENABLED=true" .env; then
        echo "   ✅ HTTPS_ENABLED=true"
    else
        echo "   ⚠️  HTTPS_ENABLED no está configurado o es false"
    fi
    
    if grep -q "SSL_CERT_PATH\|SSL_KEY_PATH" .env; then
        echo "   ✅ SSL_CERT_PATH y SSL_KEY_PATH configurados"
    else
        echo "   ℹ️  Usando rutas por defecto: ./certs/cert.pem y ./certs/key.pem"
    fi
else
    echo "   ⚠️  Archivo .env no encontrado"
    echo "   ℹ️  Crea un archivo .env con HTTPS_ENABLED=true"
fi

echo ""

# Resumen
echo "📊 Resumen:"
if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    echo "   ✅ Certificados SSL encontrados"
    echo ""
    echo "🚀 Para activar HTTPS:"
    echo "   1. Asegúrate de que .env tenga: HTTPS_ENABLED=true"
    echo "   2. Reinicia el servidor: npm run start:dev"
    echo "   3. Accede a: https://localhost:3443"
    echo ""
    echo "🔍 Para verificar que funciona:"
    echo "   - Busca en los logs: '🔒 Backend Hotel Meducin ejecutándose en HTTPS'"
    echo "   - Abre en el navegador: https://localhost:3443"
    echo "   - Deberías ver una advertencia de certificado autofirmado (normal en desarrollo)"
else
    echo "   ❌ Certificados SSL faltantes"
    echo ""
    echo "🔧 Para generar certificados:"
    echo "   ./scripts/generate-ssl-cert.sh"
    echo ""
    echo "   O manualmente con OpenSSL:"
    echo "   mkdir -p certs"
    echo "   openssl genrsa -out certs/key.pem 2048"
    echo "   openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 -subj '/CN=localhost'"
fi

echo ""

