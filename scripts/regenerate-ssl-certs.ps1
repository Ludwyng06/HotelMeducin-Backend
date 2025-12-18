# Script PowerShell para regenerar certificados SSL correctamente
# Soluciona el error "key values mismatch"

Write-Host "🔐 Regenerando certificados SSL (solucionando key mismatch)..." -ForegroundColor Cyan

# Crear directorio de certificados si no existe
if (-not (Test-Path "certs")) {
    New-Item -ItemType Directory -Path "certs" | Out-Null
}

# Eliminar certificados antiguos
Write-Host "🗑️  Eliminando certificados antiguos..." -ForegroundColor Yellow
if (Test-Path "certs/cert.pem") { Remove-Item "certs/cert.pem" -Force }
if (Test-Path "certs/key.pem") { Remove-Item "certs/key.pem" -Force }
if (Test-Path "certs/cert.pfx") { Remove-Item "certs/cert.pfx" -Force }

# Verificar si OpenSSL está disponible
$opensslPath = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $opensslPath) {
    Write-Host "❌ OpenSSL no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "   Instala OpenSSL o usa Git Bash para ejecutar el script .sh" -ForegroundColor Yellow
    exit 1
}

# Generar nueva clave privada
Write-Host "📝 Generando nueva clave privada..." -ForegroundColor Cyan
if (openssl genrsa -out certs/key.pem 2048) {
    Write-Host "   ✅ Clave privada generada" -ForegroundColor Green
} else {
    Write-Host "   ❌ Error al generar clave privada" -ForegroundColor Red
    exit 1
}

# Obtener el hostname del sistema
$hostname = $env:COMPUTERNAME
Write-Host "📝 Hostname detectado: $hostname" -ForegroundColor Cyan

# Crear archivo de configuración para el certificado con SAN
$configFile = "certs/cert.conf"
@"
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
DNS.2 = $hostname
IP.1 = 127.0.0.1
IP.2 = ::1
"@ | Out-File -FilePath $configFile -Encoding ASCII

# Generar certificado autofirmado con SAN usando la nueva clave
Write-Host "📝 Generando certificado con Subject Alternative Names..." -ForegroundColor Cyan
if (openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 -config $configFile -extensions v3_req) {
    Write-Host "   ✅ Certificado generado" -ForegroundColor Green
} else {
    Write-Host "   ❌ Error al generar certificado" -ForegroundColor Red
    Remove-Item $configFile -Force -ErrorAction SilentlyContinue
    exit 1
}

# Limpiar archivo temporal
Remove-Item $configFile -Force -ErrorAction SilentlyContinue

# Verificar que los archivos existen
if ((Test-Path "certs/cert.pem") -and (Test-Path "certs/key.pem")) {
    Write-Host ""
    Write-Host "✅ Certificados regenerados exitosamente en ./certs/" -ForegroundColor Green
    Write-Host "   - certs/key.pem (clave privada)" -ForegroundColor Green
    Write-Host "   - certs/cert.pem (certificado)" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 El certificado incluye los siguientes nombres:" -ForegroundColor Cyan
    Write-Host "   - localhost" -ForegroundColor White
    Write-Host "   - $hostname" -ForegroundColor White
    Write-Host "   - 127.0.0.1" -ForegroundColor White
    Write-Host "   - ::1" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 Tamaños:" -ForegroundColor Cyan
    Get-ChildItem certs/*.pem | ForEach-Object {
        Write-Host "   $($_.Name): $([math]::Round($_.Length/1KB, 2)) KB" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "🚀 Reinicia el backend y frontend para aplicar los nuevos certificados" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Error: Los certificados no se generaron correctamente" -ForegroundColor Red
    exit 1
}

