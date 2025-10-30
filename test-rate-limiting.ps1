# Script para probar Rate Limiting en ClinicaPeru Backend
# Uso: .\test-rate-limiting.ps1

Write-Host "🧪 Testing Rate Limiting - ClinicaPeru Backend" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Configuración
$apiUrl = "http://localhost:3000"
$endpoint = "/auth/login"
$requests = 15
$expectedLimit = 10

Write-Host "📍 Endpoint: $apiUrl$endpoint"
Write-Host "🔢 Requests a enviar: $requests"
Write-Host "⚠️  Límite esperado: $expectedLimit requests/minuto"
Write-Host ""
Write-Host "Iniciando prueba..." -ForegroundColor Yellow
Write-Host ""

# Contadores
$successCount = 0
$rateLimitCount = 0

# Hacer requests
for ($i = 1; $i -le $requests; $i++) {
    Write-Host "Request #$i`: " -NoNewline
    
    try {
        $body = @{
            email = "test@test.com"
            password = "wrongpassword"
        } | ConvertTo-Json

        $response = Invoke-WebRequest -Uri "$apiUrl$endpoint" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body `
            -ErrorAction SilentlyContinue
        
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq 401) {
            Write-Host "✅ 401 Unauthorized (credenciales inválidas - esperado)" -ForegroundColor Green
            $successCount++
        }
        else {
            Write-Host "❓ $statusCode (inesperado)" -ForegroundColor Yellow
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($statusCode -eq 429) {
            Write-Host "🛡️  429 Too Many Requests (RATE LIMIT ACTIVADO) ✅" -ForegroundColor Magenta
            $rateLimitCount++
        }
        elseif ($statusCode -eq 401) {
            Write-Host "✅ 401 Unauthorized (credenciales inválidas - esperado)" -ForegroundColor Green
            $successCount++
        }
        else {
            Write-Host "❌ Error: $statusCode" -ForegroundColor Red
        }
    }
    
    # Pequeña pausa entre requests
    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "📊 Resultados:" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "✅ Requests procesados: $successCount" -ForegroundColor Green
Write-Host "🛡️  Requests bloqueados: $rateLimitCount" -ForegroundColor Magenta
Write-Host ""

if ($rateLimitCount -gt 0) {
    Write-Host "✅ ¡RATE LIMITING FUNCIONANDO CORRECTAMENTE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Interpretación:"
    Write-Host "- Primeros ~$expectedLimit requests: Procesados (401)"
    Write-Host "- Siguientes requests: Bloqueados (429)"
    Write-Host "- El backend está protegido contra brute force ✅" -ForegroundColor Green
}
else {
    Write-Host "⚠️  WARNING: No se detectó rate limiting" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Posibles causas:"
    Write-Host "1. El servidor no está corriendo"
    Write-Host "2. ThrottlerModule no está configurado"
    Write-Host "3. El límite es mayor a $requests requests"
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "🔍 Para ver los headers de rate limit:" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ejecuta en PowerShell:" -ForegroundColor Yellow
Write-Host ""
Write-Host '$response = Invoke-WebRequest -Uri "http://localhost:3000/auth/login" `' -ForegroundColor Gray
Write-Host '  -Method POST `' -ForegroundColor Gray
Write-Host '  -ContentType "application/json" `' -ForegroundColor Gray
Write-Host '  -Body ''{"email":"test@test.com","password":"test"}'' `' -ForegroundColor Gray
Write-Host '  -ErrorAction SilentlyContinue' -ForegroundColor Gray
Write-Host ""
Write-Host '$response.Headers' -ForegroundColor Gray
Write-Host ""
Write-Host "Buscar headers:" -ForegroundColor Yellow
Write-Host "  X-RateLimit-Limit: 10"
Write-Host "  X-RateLimit-Remaining: 9"
Write-Host "  Retry-After: 60"
Write-Host ""
