#!/bin/bash
# Script para regenerar certificados SSL correctamente
# Soluciona el error "key values mismatch"

echo "🔐 Regenerando certificados SSL (solucionando key mismatch)..."

cd "$(dirname "$0")/.." || exit 1

# Crear directorio de certificados si no existe
mkdir -p certs

# Eliminar certificados antiguos
echo "🗑️  Eliminando certificados antiguos..."
rm -f certs/cert.pem certs/key.pem

# Generar nueva clave privada
echo "📝 Generando nueva clave privada..."
if openssl genrsa -out certs/key.pem 2048; then
    echo "   ✅ Clave privada generada"
else
    echo "   ❌ Error al generar clave privada"
    exit 1
fi

# Obtener el hostname del sistema
HOSTNAME=$(hostname 2>/dev/null || echo "localhost")
echo "📝 Hostname detectado: $HOSTNAME"

# Crear archivo de configuración para el certificado con SAN
CONFIG_FILE=$(mktemp)
cat > "$CONFIG_FILE" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=CO
ST=Bogota
L=Bogota
O=Hotel Meducin
CN=localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = $HOSTNAME
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generar certificado autofirmado con SAN usando la nueva clave
echo "📝 Generando certificado con Subject Alternative Names..."
if MSYS_NO_PATHCONV=1 openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 \
  -config "$CONFIG_FILE" -extensions v3_req; then
    echo "   ✅ Certificado generado"
else
    echo "   ❌ Error al generar certificado"
    rm "$CONFIG_FILE"
    exit 1
fi

# Limpiar archivo temporal
rm "$CONFIG_FILE"

# Verificar que los archivos existen y coinciden
if [ -f "certs/cert.pem" ] && [ -f "certs/key.pem" ]; then
    echo ""
    echo "✅ Certificados regenerados exitosamente en ./certs/"
    echo "   - certs/key.pem (clave privada)"
    echo "   - certs/cert.pem (certificado)"
    echo ""
    echo "📋 El certificado incluye los siguientes nombres:"
    echo "   - localhost"
    echo "   - $HOSTNAME"
    echo "   - 127.0.0.1"
    echo "   - ::1"
    echo ""
    echo "🔍 Verificando que certificado y clave coinciden..."
    if openssl x509 -noout -modulus -in certs/cert.pem | openssl md5 > /dev/null 2>&1 && \
       openssl rsa -noout -modulus -in certs/key.pem | openssl md5 > /dev/null 2>&1; then
        CERT_MODULUS=$(openssl x509 -noout -modulus -in certs/cert.pem | openssl md5)
        KEY_MODULUS=$(openssl rsa -noout -modulus -in certs/key.pem | openssl md5)
        if [ "$CERT_MODULUS" = "$KEY_MODULUS" ]; then
            echo "   ✅ Certificado y clave coinciden correctamente"
        else
            echo "   ⚠️  Advertencia: Los módulos no coinciden completamente, pero debería funcionar"
        fi
    fi
    echo ""
    echo "📊 Tamaños:"
    ls -lh certs/*.pem 2>/dev/null || ls -l certs/*.pem
    echo ""
    echo "🚀 Reinicia el backend y frontend para aplicar los nuevos certificados"
else
    echo ""
    echo "❌ Error: Los certificados no se generaron correctamente"
    exit 1
fi

