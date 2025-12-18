# Script para configurar HTTPS en desarrollo local
# Ejecuta: .\scripts\setup-https-local.ps1

Write-Host "🔐 Configuración HTTPS para Desarrollo Local" -ForegroundColor Cyan
Write-Host ""

# Verificar si mkcert está instalado
Write-Host "📋 Verificando mkcert..." -ForegroundColor Yellow
$mkcertPath = Get-Command mkcert -ErrorAction SilentlyContinue

if (-not $mkcertPath) {
    Write-Host "❌ mkcert no está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Opciones para instalar:" -ForegroundColor Yellow
    Write-Host "   1. Con Chocolatey: choco install mkcert" -ForegroundColor White
    Write-Host "   2. Con Scoop: scoop install mkcert" -ForegroundColor White
    Write-Host "   3. Manual: Descarga desde https://github.com/FiloSottile/mkcert/releases" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ mkcert encontrado: $($mkcertPath.Source)" -ForegroundColor Green
Write-Host ""

# Instalar CA local (solo si no está instalada)
Write-Host "📋 Instalando Autoridad Certificadora local..." -ForegroundColor Yellow
try {
    mkcert -install 2>&1 | Out-Null
    Write-Host "✅ CA local instalada correctamente" -ForegroundColor Green
} catch {
    Write-Host "⚠️  La CA local ya está instalada o hubo un error" -ForegroundColor Yellow
}
Write-Host ""

# Crear directorio de certificados
Write-Host "📋 Creando directorio de certificados..." -ForegroundColor Yellow
$certsDir = Join-Path $PSScriptRoot "..\certs"
if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir -Force | Out-Null
    Write-Host "✅ Directorio creado: $certsDir" -ForegroundColor Green
} else {
    Write-Host "✅ Directorio ya existe: $certsDir" -ForegroundColor Green
}
Write-Host ""

# Generar certificados
Write-Host "📋 Generando certificados SSL..." -ForegroundColor Yellow
$keyPath = Join-Path $certsDir "key.pem"
$certPath = Join-Path $certsDir "cert.pem"

try {
    mkcert -key-file $keyPath -cert-file $certPath localhost 127.0.0.1 ::1
    Write-Host "✅ Certificados generados correctamente" -ForegroundColor Green
    Write-Host "   Clave: $keyPath" -ForegroundColor Gray
    Write-Host "   Certificado: $certPath" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error al generar certificados: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Verificar archivo .env
Write-Host "📋 Verificando configuración .env..." -ForegroundColor Yellow
$envPath = Join-Path $PSScriptRoot "..\.env"

if (-not (Test-Path $envPath)) {
    Write-Host "⚠️  Archivo .env no encontrado" -ForegroundColor Yellow
    Write-Host "📝 Creando archivo .env desde .env.example..." -ForegroundColor Yellow
    
    $envExamplePath = Join-Path $PSScriptRoot "..\.env.example"
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
        Write-Host "✅ Archivo .env creado desde .env.example" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando archivo .env básico..." -ForegroundColor Yellow
        @"
# Configuración HTTPS para desarrollo local
HTTPS_ENABLED=true
SSL_CERT_PATH=./certs/cert.pem
SSL_KEY_PATH=./certs/key.pem
HTTPS_PORT=3443
FRONTEND_URL=https://localhost:4200

# Otras configuraciones
PORT=3000
NODE_ENV=development
"@ | Out-File -FilePath $envPath -Encoding UTF8
        Write-Host "✅ Archivo .env básico creado" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Archivo .env encontrado" -ForegroundColor Green
    
    # Verificar si tiene las variables HTTPS
    $envContent = Get-Content $envPath -Raw
    if ($envContent -notmatch "HTTPS_ENABLED") {
        Write-Host "⚠️  Agregando variables HTTPS al .env..." -ForegroundColor Yellow
        Add-Content -Path $envPath -Value "`n# Configuración HTTPS para desarrollo local`nHTTPS_ENABLED=true`nSSL_CERT_PATH=./certs/cert.pem`nSSL_KEY_PATH=./certs/key.pem`nHTTPS_PORT=3443`nFRONTEND_URL=https://localhost:4200"
        Write-Host "✅ Variables HTTPS agregadas" -ForegroundColor Green
    } else {
        Write-Host "✅ Variables HTTPS ya configuradas" -ForegroundColor Green
    }
}
Write-Host ""

# Resumen
Write-Host "✅ Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Verifica que Backend/.env tenga las variables HTTPS configuradas" -ForegroundColor White
Write-Host "   2. Inicia el backend: cd Backend && npm run start:dev" -ForegroundColor White
Write-Host "   3. Inicia el frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: https://localhost:4200" -ForegroundColor White
Write-Host "   Backend:  https://localhost:3443" -ForegroundColor White
Write-Host ""

