# Solución al Problema de Codificación UTF-8

## 🐛 Problema
Después de varios minutos de estar el backend en ejecución, los caracteres con tildes (á, é, í, ó, ú, ñ) se transformaban en �. La base de datos estaba correctamente configurada, pero el backend no manejaba correctamente la codificación UTF-8.

## ✅ Soluciones Implementadas

### 1. Configuración de Express en `main.ts`
- **Problema**: El header `Content-Type` con charset UTF-8 estaba comentado
- **Solución**: Se descomentó y configuró correctamente el middleware para establecer el charset UTF-8 en todas las respuestas

```typescript
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});
```

### 2. Configuración de PrismaService (`prisma.service.ts`)
- **Problema**: No se configuraba el encoding UTF-8 al conectarse a PostgreSQL
- **Solución**: Se agregó comando SQL para establecer `client_encoding` a UTF-8 al inicializar la conexión

```typescript
async onModuleInit() {
  await this.$connect();
  // Configurar encoding UTF-8 para PostgreSQL
  await this.$executeRawUnsafe("SET client_encoding = 'UTF8'");
}
```

### 3. DATABASE_URL con parámetro de encoding
- **Problema**: La URL de conexión no especificaba el encoding
- **Solución**: Se agregó el parámetro `encoding=utf8` en el `.env.example`

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/clinicaperu?schema=public&encoding=utf8"
```

## 📋 Pasos para Aplicar la Solución

1. **Actualizar tu archivo `.env`**:
   - Abre tu archivo `.env` (NO el `.env.example`)
   - Busca la línea de `DATABASE_URL`
   - Agrega el parámetro `&encoding=utf8` al final:
   ```
   DATABASE_URL="postgresql://tu_usuario:tu_password@tu_host:5432/tu_db?schema=public&encoding=utf8"
   ```

2. **Reiniciar el backend**:
   ```bash
   # Detén el servidor actual
   # Luego reinicia:
   npm run start:dev
   # o
   npm run start:prod
   ```

3. **Verificar la solución**:
   - Espera unos minutos con el backend prendido
   - Haz peticiones a endpoints que retornen texto con tildes
   - Verifica que los caracteres con tildes se muestren correctamente

## 🔍 Por Qué Ocurría el Problema

El problema ocurría porque:
1. **PostgreSQL por defecto** puede usar un encoding diferente a UTF-8 dependiendo de la configuración del sistema
2. **Express/Node.js** sin configuración explícita puede no forzar UTF-8 en las respuestas HTTP
3. **Prisma Client** sin configuración explícita usa el encoding por defecto de la conexión

Cuando el backend llevaba tiempo ejecutándose, posiblemente:
- El pool de conexiones de PostgreSQL se renovaba
- Las nuevas conexiones no heredaban la configuración UTF-8
- Los datos se leían correctamente de la DB pero se enviaban con encoding incorrecto al cliente

## 🛡️ Prevención Futura

Con estas tres capas de protección:
1. ✅ Header HTTP con charset UTF-8
2. ✅ Conexión PostgreSQL con encoding UTF-8
3. ✅ Client encoding UTF-8 en Prisma

El problema no debería volver a ocurrir, incluso después de horas de ejecución continua del backend.
