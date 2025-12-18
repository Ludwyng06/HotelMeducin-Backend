# Script PowerShell para generar certificados SSL autofirmados en Windows

Write-Host "🔐 Generando certificados SSL autofirmados para desarrollo..." -ForegroundColor Cyan

# Crear directorio de certificados si no existe
if (-not (Test-Path "certs")) {
    New-Item -ItemType Directory -Path "certs" | Out-Null
}

# Generar certificado autofirmado usando PowerShell (Windows)
$cert = New-SelfSignedCertificate `
    -DnsName "localhost" `
    -CertStoreLocation "cert:\LocalMachine\My" `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -NotAfter (Get-Date).AddYears(1)

# Exportar certificado y clave privada
$password = ConvertTo-SecureString -String "hotelmeducin2024" -Force -AsPlainText

# Exportar certificado con clave privada
Export-PfxCertificate -Cert $cert -FilePath "certs\cert.pfx" -Password $password | Out-Null

# Exportar certificado público
Export-Certificate -Cert $cert -FilePath "certs\cert.pem" -Type CERT | Out-Null

# Exportar clave privada (requiere OpenSSL o conversión manual)
Write-Host "⚠️  Nota: Para obtener key.pem, necesitas OpenSSL instalado:" -ForegroundColor Yellow
Write-Host "   openssl pkcs12 -in certs/cert.pfx -nocerts -nodes -out certs/key.pem -passin pass:hotelmeducin2024" -ForegroundColor Yellow

Write-Host "✅ Certificados generados en ./certs/" -ForegroundColor Green
Write-Host "   - certs/cert.pfx (certificado con clave privada)" -ForegroundColor Green
Write-Host "   - certs/cert.pem (certificado público)" -ForegroundColor Green

