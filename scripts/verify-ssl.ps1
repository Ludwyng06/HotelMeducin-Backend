# Script PowerShell para verificar configuración SSL/HTTPS

Write-Host "🔍 Verificando configuración SSL/HTTPS..." -ForegroundColor Cyan
Write-Host ""

# Verificar si existe el directorio de certificados
$certsDir = "certs"
if (-not (Test-Path $certsDir)) {
    Write-Host "❌ Directorio 'certs' no existe" -ForegroundColor Red
    Write-Host "   Ejecuta: .\scripts\generate-ssl-cert.ps1" -ForegroundColor Yellow
    exit 1
}

# Verificar certificado
$certPath = Join-Path $certsDir "cert.pem"
$keyPath = Join-Path $certsDir "key.pem"

$certExists = Test-Path $certPath
$keyExists = Test-Path $keyPath

Write-Host "📁 Certificados:" -ForegroundColor Cyan
if ($certExists) {
    $certInfo = Get-Item $certPath
    Write-Host "   ✅ cert.pem existe ($($certInfo.Length) bytes)" -ForegroundColor Green
} else {
    Write-Host "   ❌ cert.pem NO existe" -ForegroundColor Red
}

if ($keyExists) {
    $keyInfo = Get-Item $keyPath
    Write-Host "   ✅ key.pem existe ($($keyInfo.Length) bytes)" -ForegroundColor Green
} else {
    Write-Host "   ❌ key.pem NO existe" -ForegroundColor Red
}

Write-Host ""

# Verificar variables de entorno
Write-Host "⚙️  Variables de entorno:" -ForegroundColor Cyan

$envFile = ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    $httpsEnabled = $envContent -match "HTTPS_ENABLED\s*=\s*true"
    if ($httpsEnabled) {
        Write-Host "   ✅ HTTPS_ENABLED=true" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  HTTPS_ENABLED no está configurado o es false" -ForegroundColor Yellow
    }
    
    $certPathEnv = $envContent -match "SSL_CERT_PATH"
    $keyPathEnv = $envContent -match "SSL_KEY_PATH"
    
    if ($certPathEnv -or $keyPathEnv) {
        Write-Host "   ✅ SSL_CERT_PATH y SSL_KEY_PATH configurados" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  Usando rutas por defecto: ./certs/cert.pem y ./certs/key.pem" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ⚠️  Archivo .env no encontrado" -ForegroundColor Yellow
    Write-Host "   ℹ️  Crea un archivo .env con HTTPS_ENABLED=true" -ForegroundColor Cyan
}

Write-Host ""

# Resumen
Write-Host "📊 Resumen:" -ForegroundColor Cyan
if ($certExists -and $keyExists) {
    Write-Host "   ✅ Certificados SSL encontrados" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Para activar HTTPS:" -ForegroundColor Cyan
    Write-Host "   1. Asegúrate de que .env tenga: HTTPS_ENABLED=true" -ForegroundColor Yellow
    Write-Host "   2. Reinicia el servidor: npm run start:dev" -ForegroundColor Yellow
    Write-Host "   3. Accede a: https://localhost:3443" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔍 Para verificar que funciona:" -ForegroundColor Cyan
    Write-Host "   - Busca en los logs: '🔒 Backend Hotel Meducin ejecutándose en HTTPS'" -ForegroundColor Yellow
    Write-Host "   - Abre en el navegador: https://localhost:3443" -ForegroundColor Yellow
    Write-Host "   - Deberías ver una advertencia de certificado autofirmado (normal en desarrollo)" -ForegroundColor Yellow
} else {
    Write-Host "   ❌ Certificados SSL faltantes" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Para generar certificados:" -ForegroundColor Cyan
    Write-Host "   .\scripts\generate-ssl-cert.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   O manualmente con OpenSSL:" -ForegroundColor Cyan
    Write-Host "   mkdir certs" -ForegroundColor Yellow
    Write-Host "   openssl genrsa -out certs/key.pem 2048" -ForegroundColor Yellow
    Write-Host "   openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 -subj '/CN=localhost'" -ForegroundColor Yellow
}

Write-Host ""

