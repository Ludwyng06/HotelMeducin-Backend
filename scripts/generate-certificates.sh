#!/bin/bash
# Script para generar certificados SSL para desarrollo local

cd "$(dirname "$0")/.." || exit

echo "🔐 Generando certificados SSL para desarrollo local..."
echo ""

# Verificar si OpenSSL está instalado
if ! command -v openssl &> /dev/null; then
    echo "❌ OpenSSL no está instalado"
    echo "💡 Instala OpenSSL o usa Git Bash que lo incluye"
    exit 1
fi

# Crear directorio certs si no existe
mkdir -p certs

# Verificar si ya existe la clave
if [ ! -f "certs/key.pem" ]; then
    echo "📋 Generando clave privada..."
    openssl genrsa -out certs/key.pem 2048
    echo "✅ Clave privada generada"
else
    echo "✅ Clave privada ya existe"
fi

# Verificar si ya existe el certificado
if [ ! -f "certs/cert.pem" ]; then
    echo "📋 Generando certificado..."
    if [ -f "certs/cert.conf" ]; then
        openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 -config certs/cert.conf -extensions v3_req
        echo "✅ Certificado generado usando cert.conf"
    else
        echo "⚠️  cert.conf no encontrado, generando certificado básico..."
        openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 \
          -subj '/C=CO/ST=Bogota/L=Bogota/O=Hotel Meducin/CN=localhost'
        echo "✅ Certificado básico generado"
    fi
else
    echo "✅ Certificado ya existe"
fi

echo ""
echo "📋 Verificando archivos generados..."
ls -lh certs/*.pem 2>/dev/null || echo "⚠️  No se encontraron archivos .pem"

echo ""
echo "✅ Proceso completado!"
echo ""
echo "📋 Archivos en certs/:"
ls -la certs/

