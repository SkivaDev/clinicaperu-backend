#!/bin/bash

# Script para probar Rate Limiting en ClinicaPeru Backend
# Uso: bash test-rate-limiting.sh

echo "🧪 Testing Rate Limiting - ClinicaPeru Backend"
echo "=============================================="
echo ""

# Configuración
API_URL="http://localhost:3000"
ENDPOINT="/auth/login"
REQUESTS=15
EXPECTED_LIMIT=10

echo "📍 Endpoint: $API_URL$ENDPOINT"
echo "🔢 Requests a enviar: $REQUESTS"
echo "⚠️  Límite esperado: $EXPECTED_LIMIT requests/minuto"
echo ""
echo "Iniciando prueba..."
echo ""

# Contadores
SUCCESS_COUNT=0
RATE_LIMIT_COUNT=0

# Hacer requests
for i in $(seq 1 $REQUESTS); do
  echo -n "Request #$i: "
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpassword"}')
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ 401 Unauthorized (credenciales inválidas - esperado)"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  elif [ "$HTTP_CODE" = "429" ]; then
    echo "🛡️  429 Too Many Requests (RATE LIMIT ACTIVADO) ✅"
    RATE_LIMIT_COUNT=$((RATE_LIMIT_COUNT + 1))
  else
    echo "❓ $HTTP_CODE (inesperado)"
  fi
  
  # Pequeña pausa entre requests
  sleep 0.1
done

echo ""
echo "=============================================="
echo "📊 Resultados:"
echo "=============================================="
echo "✅ Requests procesados: $SUCCESS_COUNT"
echo "🛡️  Requests bloqueados: $RATE_LIMIT_COUNT"
echo ""

if [ $RATE_LIMIT_COUNT -gt 0 ]; then
  echo "✅ ¡RATE LIMITING FUNCIONANDO CORRECTAMENTE!"
  echo ""
  echo "Interpretación:"
  echo "- Primeros ~$EXPECTED_LIMIT requests: Procesados (401)"
  echo "- Siguientes requests: Bloqueados (429)"
  echo "- El backend está protegido contra brute force ✅"
else
  echo "⚠️  WARNING: No se detectó rate limiting"
  echo ""
  echo "Posibles causas:"
  echo "1. El servidor no está corriendo"
  echo "2. ThrottlerModule no está configurado"
  echo "3. El límite es mayor a $REQUESTS requests"
fi

echo ""
echo "=============================================="
echo "🔍 Para ver los headers de rate limit:"
echo "=============================================="
echo ""
echo "curl -v -X POST $API_URL$ENDPOINT \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\":\"test@test.com\",\"password\":\"test\"}'"
echo ""
echo "Buscar headers:"
echo "  X-RateLimit-Limit: 10"
echo "  X-RateLimit-Remaining: 9"
echo "  Retry-After: 60"
echo ""
