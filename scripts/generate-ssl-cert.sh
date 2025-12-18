#!/bin/bash
# Script para generar certificados SSL autofirmados para desarrollo

echo "🔐 Generando certificados SSL autofirmados para desarrollo..."

# Crear directorio de certificados si no existe
mkdir -p certs

# Generar clave privada
echo "📝 Generando clave privada..."
if openssl genrsa -out certs/key.pem 2048; then
    echo "   ✅ Clave privada generada"
else
    echo "   ❌ Error al generar clave privada"
    exit 1
fi

# Generar certificado autofirmado (válido por 365 días)
# Usar comillas simples y formato correcto para Git Bash en Windows
echo "📝 Generando certificado..."
if openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 -subj '/C=CO/ST=Bogota/L=Bogota/O=Hotel Meducin/CN=localhost' 2>&1; then
    echo "   ✅ Certificado generado"
else
    echo "   ❌ Error al generar certificado"
    echo "   💡 Intenta ejecutar manualmente:"
    echo "      openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 -subj '/C=CO/ST=Bogota/L=Bogota/O=Hotel Meducin/CN=localhost'"
    exit 1
fi

# Verificar que los archivos existen
if [ -f "certs/cert.pem" ] && [ -f "certs/key.pem" ]; then
    echo ""
    echo "✅ Certificados generados exitosamente en ./certs/"
    echo "   - certs/key.pem (clave privada)"
    echo "   - certs/cert.pem (certificado)"
    echo ""
    echo "📊 Tamaños:"
    ls -lh certs/*.pem 2>/dev/null || ls -l certs/*.pem
else
    echo ""
    echo "❌ Error: Los certificados no se generaron correctamente"
    exit 1
fi

