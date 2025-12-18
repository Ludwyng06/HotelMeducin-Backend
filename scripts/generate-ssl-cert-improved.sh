#!/bin/bash
# Script mejorado para generar certificados SSL autofirmados con SAN (Subject Alternative Names)
# Incluye localhost y el hostname del sistema

echo "🔐 Generando certificados SSL autofirmados para desarrollo..."

# Crear directorio de certificados si no existe
mkdir -p certs

# Obtener el hostname del sistema
HOSTNAME=$(hostname 2>/dev/null || echo "localhost")
echo "📝 Hostname detectado: $HOSTNAME"

# Generar clave privada
echo "📝 Generando clave privada..."
openssl genrsa -out certs/key.pem 2048

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

# Generar certificado autofirmado con SAN
echo "📝 Generando certificado con Subject Alternative Names..."
MSYS_NO_PATHCONV=1 openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 \
  -config "$CONFIG_FILE" -extensions v3_req

# Limpiar archivo temporal
rm "$CONFIG_FILE"

echo ""
echo "✅ Certificados generados exitosamente en ./certs/"
echo "   - certs/key.pem (clave privada)"
echo "   - certs/cert.pem (certificado)"
echo ""
echo "📋 El certificado incluye los siguientes nombres:"
echo "   - localhost"
echo "   - $HOSTNAME"
echo "   - 127.0.0.1"
echo "   - ::1"
echo ""
echo "🔍 Para verificar el certificado:"
echo "   openssl x509 -in certs/cert.pem -text -noout | grep -A 2 'Subject Alternative Name'"

