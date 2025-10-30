# HU-028: Settings & Profile Management (AWS S3) - Implementación Backend

## 📋 Resumen

Implementación completa del sistema de gestión de perfiles con integración de AWS S3 para subida de imágenes de perfil. Permite a usuarios (pacientes y doctores) actualizar su información personal, cambiar su foto de perfil mediante URLs prefirmadas de S3, y modificar su contraseña de forma segura.

## 🎯 Objetivo

Proporcionar endpoints seguros y optimizados para que los usuarios gestionen su perfil personal, incluyendo:
- Obtención de perfil con URLs prefirmadas temporales para imágenes
- Actualización de datos personales con validaciones
- Cambio de contraseña con requisitos de seguridad
- Subida de imágenes de perfil directamente a AWS S3

## 🏗️ Arquitectura Implementada

### Estructura de Archivos

```
src/
├── common/
│   └── s3/
│       ├── s3.module.ts           # Módulo S3 reutilizable
│       └── s3.service.ts          # Servicio para URLs prefirmadas
├── uploads/
│   ├── dto/
│   │   └── generate-upload-url.dto.ts  # DTO para generar URL
│   ├── uploads.controller.ts     # Controlador de uploads
│   └── uploads.module.ts          # Módulo de uploads
└── users/
    ├── dto/
    │   ├── update-profile.dto.ts  # DTO para actualizar perfil
    │   ├── change-password.dto.ts # DTO para cambiar contraseña
    │   └── profile-response.dto.ts # DTOs de respuesta
    ├── users.controller.ts        # Endpoints de perfil
    ├── users.service.ts           # Lógica de negocio
    └── users.module.ts            # Módulo actualizado
```

## 🔧 Componentes Implementados

### 1. **S3Service** (`src/common/s3/s3.service.ts`)

Servicio centralizado para gestión de AWS S3.

#### Métodos Principales:

**`generateUploadUrl(userId, fileName, fileType, expiresIn)`**
- Genera URL prefirmada para SUBIR archivos a S3
- Key format: `profile-images/{userId}/{uuid}-{fileName}`
- Expir ación: 300 segundos (5 minutos) por defecto
- Sanitiza nombres de archivo automáticamente

**`generateDownloadUrl(key, expiresIn)`**
- Genera URL prefirmada para DESCARGAR archivos de S3
- Usado para mostrar imágenes de perfil
- Expiración: 300 segundos (5 minutos) por defecto

**`deleteFile(key)`**
- Elimina archivo de S3
- Usado al actualizar foto de perfil (borra la anterior)

#### Configuración:

```typescript
// Variables de entorno requeridas
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=tu-bucket-name
```

### 2. **UploadsModule** (`src/uploads/`)

Módulo dedicado para gestión de uploads a S3.

#### Endpoint:

**POST `/uploads/generate-presigned-url`**

- **Autenticación:** JWT obligatorio
- **Rate Limiting:** 10 requests/minuto
- **Roles:** PATIENT, DOCTOR, ADMIN

**Request:**
```json
{
  "fileName": "profile-photo.jpg",
  "fileType": "image/jpeg"  // Solo: image/jpeg, image/png, image/webp
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Upload URL generated successfully",
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/bucket/profile-images/user-id/uuid-file.jpg?X-Amz-...",
    "key": "profile-images/user-id/uuid-file.jpg"
  }
}
```

**Flujo de Uso (Frontend):**
1. Frontend llama a `POST /uploads/generate-presigned-url`
2. Backend genera URL prefirmada y retorna `uploadUrl` y `key`
3. Frontend sube archivo directamente a S3 con `PUT uploadUrl` (binary)
4. Frontend guarda `key` y la envía en `PUT /users/profile`

### 3. **UsersService - Métodos Nuevos**

#### `getProfile(userId): Promise<PatientProfileDto | DoctorProfileDto>`

Obtiene el perfil del usuario autenticado.

**Características:**
- Genera URL prefirmada para `profileImage` si existe
- Retorna diferentes DTOs según rol (PATIENT vs DOCTOR)
- Doctores reciben información profesional adicional (CMP, specialty, clinic, etc.)
- No expone `passwordHash`

**Response para Paciente:**
```json
{
  "id": "uuid",
  "firstName": "Juan",
  "lastName": "Pérez",
  "dni": "12345678",
  "email": "juan@example.com",
  "phone": "+51987654321",
  "dayOfBirth": "1990-01-15T00:00:00.000Z",
  "gender": "MALE",
  "profileImage": "https://s3.amazonaws.com/...?X-Amz-...",  // URL temporal
  "role": "PATIENT",
  "isActive": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

**Response para Doctor (incluye `doctorInfo`):**
```json
{
  ...paciente_fields,
  "doctorInfo": {
    "id": "doctor-uuid",
    "cmp": 12345,
    "specialty": "Cardiología",
    "clinic": "Clínica San Pablo",
    "yearsOfExperience": 10,
    "consultationPrice": 150.00,
    "rating": 4.5
  }
}
```

#### `updateProfile(userId, dto): Promise<PatientProfileDto | DoctorProfileDto>`

Actualiza el perfil del usuario.

**Validaciones:**
- Email debe ser único si se cambia
- Phone debe tener formato internacional válido
- profileImage debe ser key de S3 válida (`profile-images/...`)
- **Campos readonly** (no se pueden modificar):
  - Paciente: `dni`, `dayOfBirth`
  - Doctor: `cmp`, `specialty`, `clinic` (solo admin puede)

**Lógica de Imagen:**
- Si se proporciona nueva `profileImage` (key), elimina la imagen anterior de S3
- Si falla el borrado de imagen anterior, continúa con la actualización (no es crítico)

#### `changePassword(userId, dto): Promise<{ message: string }>`

Cambia la contraseña del usuario.

**Validaciones:**
- `currentPassword` debe coincidir con hash almacenado
- `newPassword` !== `currentPassword`
- `newPassword` === `confirmPassword`
- `newPassword` debe cumplir requisitos:
  - Mínimo 8 caracteres
  - Al menos 1 mayúscula
  - Al menos 1 minúscula
  - Al menos 1 número

**Seguridad:**
- Hash con bcrypt (salt rounds: 10)
- Rate limiting: 5 cambios/minuto

### 4. **UsersController - Endpoints Nuevos**

#### GET `/users/profile`

Obtiene el perfil del usuario autenticado.

- **Autenticación:** JWT
- **Roles:** PATIENT, DOCTOR, ADMIN
- **Rate Limiting:** Global (100/min)

**cURL Example:**
```bash
curl -X GET http://localhost:3000/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### PUT `/users/profile`

Actualiza el perfil del usuario autenticado.

- **Autenticación:** JWT
- **Roles:** PATIENT, DOCTOR, ADMIN
- **Rate Limiting:** 5 requests/minuto

**Request Body:**
```json
{
  "firstName": "Juan Carlos",
  "lastName": "Pérez García",
  "email": "juancarlos@example.com",
  "phone": "+51987654321",
  "profileImageKey": "profile-images/user-id/uuid-filename.jpg"  // Key de S3
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan Carlos",
    "email": "juancarlos@example.com",
    "profileImageKey": "profile-images/.../image.jpg"
  }'
```

#### PUT `/users/password`

Cambia la contraseña del usuario autenticado.

- **Autenticación:** JWT
- **Roles:** PATIENT, DOCTOR, ADMIN
- **Rate Limiting:** 5 requests/minuto

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/users/password \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPassword123!",
    "newPassword": "NewPassword123!",
    "confirmPassword": "NewPassword123!"
  }'
```

## 📊 DTOs Implementados

### GenerateUploadUrlDto

```typescript
{
  fileName: string;        // Nombre del archivo
  fileType: string;        // MIME type (solo imágenes)
}
```

**Validaciones:**
- `fileType` debe ser: `image/jpeg`, `image/png`, `image/webp`

### UpdateProfileDto

```typescript
{
  firstName?: string;         // Min 2, Max 50 chars
  lastName?: string;          // Min 2, Max 50 chars
  email?: string;             // Email válido y único
  phone?: string;             // Formato internacional: +51987654321
  profileImageKey?: string;   // Key de S3: profile-images/...
}
```

### ChangePasswordDto

```typescript
{
  currentPassword: string;    // Contraseña actual
  newPassword: string;        // Min 8 chars, 1 upper, 1 lower, 1 number
  confirmPassword: string;    // Debe coincidir con newPassword
}
```

### PatientProfileDto / DoctorProfileDto

Ver sección 3 para estructura completa de responses.

## 🔒 Seguridad Implementada

### Rate Limiting

```typescript
// Uploads
POST /uploads/generate-presigned-url → 10 requests/min

// Profile
PUT /users/profile → 5 requests/min
PUT /users/password → 5 requests/min
GET /users/profile → Global (100/min)
```

### Validaciones

1. **JWT Obligatorio:** Todos los endpoints requieren autenticación
2. **Email Único:** Validado antes de actualizar
3. **Contraseña Segura:** Regex para complejidad
4. **MIME Type:** Solo imágenes permitidas
5. **S3 Key Format:** Validación de formato de key

### Protección de Datos

1. **passwordHash:** Nunca se expone en responses
2. **URLs Temporales:** Expiran en 5 minutos
3. **Campos Readonly:** No se pueden modificar sin permiso
4. **Rate Limiting:** Previene abuso

## 🌊 Flujo Completo de Subida de Imagen

### Paso a Paso (Frontend + Backend)

**1. Usuario selecciona imagen**
```javascript
// Frontend
const file = event.target.files[0];
const preview = URL.createObjectURL(file);  // Preview local
```

**2. Frontend solicita URL prefirmada**
```javascript
const response = await fetch('/uploads/generate-presigned-url', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fileName: file.name,
    fileType: file.type
  })
});

const { uploadUrl, key } = await response.json().data;
```

**3. Frontend sube archivo directamente a S3**
```javascript
await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': file.type
  },
  body: file  // Binary file
});
```

**4. Frontend actualiza perfil con key**
```javascript
await fetch('/users/profile', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    profileImage: key  // Key recibida en paso 2
  })
});
```

**5. Backend procesa actualización**
- Valida key de S3
- Elimina imagen anterior si existe
- Guarda nueva key en BD
- Retorna perfil actualizado con nueva URL prefirmada

## ⚙️ Configuración Requerida

### Variables de Entorno

```bash
# AWS S3
AWS_ACCESS_KEY_ID=AKIA...              # Access key de AWS
AWS_SECRET_ACCESS_KEY=...             # Secret key de AWS
AWS_REGION=us-east-1                  # Región del bucket
S3_BUCKET_NAME=tu-bucket-name         # Nombre del bucket

# Database (existente)
DATABASE_URL="postgresql://..."

# JWT (existente)
JWT_SECRET=tu_secret_key
```

### Permisos IAM Requeridos (AWS)

El usuario IAM debe tener permisos en el bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::tu-bucket-name/profile-images/*"
    }
  ]
}
```

### Configuración del Bucket S3

**CORS Configuration:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["http://localhost:3000", "https://tu-dominio.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

**Bucket Policy (Privado):**
- Bucket debe ser **privado**
- Acceso solo mediante URLs prefirmadas
- No permitir acceso público directo

## 📡 Ejemplos de Uso

### Obtener Perfil

```bash
curl -X GET http://localhost:3000/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "uuid",
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "profileImage": "https://s3.amazonaws.com/...?X-Amz-Expires=300..."
  }
}
```

### Generar URL de Subida

```bash
curl -X POST http://localhost:3000/uploads/generate-presigned-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "my-photo.jpg",
    "fileType": "image/jpeg"
  }'
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Upload URL generated successfully",
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/bucket/profile-images/user-id/uuid-my-photo.jpg?X-Amz-...",
    "key": "profile-images/user-id/uuid-my-photo.jpg"
  }
}
```

### Subir Archivo a S3 (desde Frontend)

```javascript
// El uploadUrl ya viene del paso anterior
await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': 'image/jpeg'
  },
  body: fileBlob
});
```

### Actualizar Perfil

```bash
curl -X PUT http://localhost:3000/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan Carlos",
    "profileImageKey": "profile-images/user-id/uuid-my-photo.jpg"
  }'
```

### Cambiar Contraseña

```bash
curl -X PUT http://localhost:3000/users/password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPass123!",
    "newPassword": "NewPass456!",
    "confirmPassword": "NewPass456!"
  }'
```

## 🧪 Testing Recomendado

### Tests Unitarios (UsersService)

```typescript
describe('UsersService - HU-028', () => {
  describe('getProfile', () => {
    it('should return patient profile with presigned URL', async () => {
      const profile = await service.getProfile('patient-id');
      expect(profile.profileImage).toContain('X-Amz-');
      expect(profile).not.toHaveProperty('passwordHash');
    });

    it('should return doctor profile with doctorInfo', async () => {
      const profile = await service.getProfile('doctor-id');
      expect(profile).toHaveProperty('doctorInfo');
      expect(profile.doctorInfo).toHaveProperty('cmp');
    });
  });

  describe('updateProfile', () => {
    it('should update profile and delete old image', async () => {
      const dto = { profileImage: 'new-key.jpg' };
      await service.updateProfile('user-id', dto);
      // Verificar que s3Service.deleteFile fue llamado
    });

    it('should throw ConflictException if email exists', async () => {
      const dto = { email: 'existing@example.com' };
      await expect(service.updateProfile('user-id', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const dto = {
        currentPassword: 'Old123!',
        newPassword: 'New456!',
        confirmPassword: 'New456!',
      };
      const result = await service.changePassword('user-id', dto);
      expect(result.message).toBe('Password updated successfully');
    });

    it('should throw BadRequestException for incorrect current password', async () => {
      const dto = {
        currentPassword: 'Wrong123!',
        newPassword: 'New456!',
        confirmPassword: 'New456!',
      };
      await expect(service.changePassword('user-id', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
```

### Tests E2E (Endpoints)

```typescript
describe('/users (e2e) - HU-028', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login y obtener token
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'Test123!' });
    authToken = response.body.data.access_token;
  });

  describe('GET /users/profile', () => {
    it('should return profile for authenticated user', () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('firstName');
          expect(res.body.data).not.toHaveProperty('passwordHash');
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/users/profile').expect(401);
    });
  });

  describe('POST /uploads/generate-presigned-url', () => {
    it('should generate upload URL', () => {
      return request(app.getHttpServer())
        .post('/uploads/generate-presigned-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileName: 'test.jpg',
          fileType: 'image/jpeg',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('uploadUrl');
          expect(res.body.data).toHaveProperty('key');
          expect(res.body.data.uploadUrl).toContain('X-Amz-');
        });
    });

    it('should reject invalid file type', () => {
      return request(app.getHttpServer())
        .post('/uploads/generate-presigned-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileName: 'test.pdf',
          fileType: 'application/pdf',
        })
        .expect(400);
    });
  });

  describe('PUT /users/profile', () => {
    it('should update profile', () => {
      return request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Updated Name',
        })
        .expect(200);
    });

    it('should throw 429 after 5 requests (rate limiting)', async () => {
      // Hacer 5 requests válidos
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .put('/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ firstName: `Name ${i}` })
          .expect(200);
      }

      // Request 6 debe ser bloqueada
      return request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Blocked' })
        .expect(429);
    });
  });

  describe('PUT /users/password', () => {
    it('should change password', () => {
      return request(app.getHttpServer())
        .put('/users/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Test123!',
          newPassword: 'NewTest456!',
          confirmPassword: 'NewTest456!',
        })
        .expect(200);
    });

    it('should reject weak password', () => {
      return request(app.getHttpServer())
        .put('/users/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Test123!',
          newPassword: 'weak',
          confirmPassword: 'weak',
        })
        .expect(400);
    });
  });
});
```

## 🚀 Deployment

### Checklist Pre-Deploy

- ✅ Variables de entorno configuradas (`.env`)
- ✅ Bucket S3 creado y configurado
- ✅ Permisos IAM configurados correctamente
- ✅ CORS configurado en S3
- ✅ Rate limiting testeado
- ✅ Tests E2E passing

### Consideraciones de Producción

1. **S3 Bucket:**
   - Usar bucket privado siempre
   - Configurar lifecycle rules para imágenes antiguas
   - Habilitar versionado si se requiere

2. **Seguridad:**
   - URLs prefirmadas con tiempo de expiración corto (5 min)
   - Validar tamaño de archivo en frontend (max 5MB recomendado)
   - Rate limiting estricto en uploads

3. **Costos:**
   - Monitorear requests a S3
   - Eliminar imágenes antiguas al actualizar perfil
   - Considerar CloudFront para distribución si hay muchos usuarios

4. **Monitoreo:**
   - Loggear todas las operaciones de S3
   - Alertas si rate limiting se excede frecuentemente
   - Monitorear errores de AWS SDK

## 📚 Documentación Adicional

### Referencias

- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [NestJS Config Module](https://docs.nestjs.com/techniques/configuration)
- [NestJS Throttler](https://docs.nestjs.com/security/rate-limiting)

### Swagger Documentation

Toda la API está documentada en Swagger:

```
http://localhost:3000/api
```

Secciones relevantes:
- **uploads** - Endpoint de presigned URLs
- **users** - Endpoints de perfil y contraseña

## ✅ Criterios de Aceptación Cumplidos

### Backend

- ✅ GET `/users/profile` - Retorna perfil con URL prefirmada
- ✅ PUT `/users/profile` - Actualiza perfil con validaciones
- ✅ PUT `/users/password` - Cambia contraseña con seguridad
- ✅ POST `/uploads/generate-presigned-url` - Genera URL de subida
- ✅ Rate limiting implementado (10/min uploads, 5/min profile/password)
- ✅ Validaciones server-side completas
- ✅ Campos readonly protegidos
- ✅ profileImage (S3 key) guardada en BD
- ✅ getProfile retorna URL prefirmada temporal
- ✅ Integración completa con AWS S3
- ✅ Documentación Swagger completa

### Seguridad

- ✅ JWT requerido en todos los endpoints
- ✅ Solo usuario autenticado puede modificar su perfil
- ✅ Email único validado
- ✅ Contraseña con requisitos de complejidad
- ✅ URLs prefirmadas temporales (5 min)
- ✅ Solo imágenes permitidas en uploads

### Código

- ✅ Código limpio y bien documentado
- ✅ DTOs con validaciones Swagger
- ✅ Logging implementado
- ✅ Error handling completo
- ✅ Servicios reutilizables (S3Service)

## 🎓 Conclusión

La implementación de HU-028 proporciona un sistema completo y seguro de gestión de perfiles con integración de AWS S3. Los usuarios pueden actualizar su información personal y cambiar su foto de perfil mediante un flujo optimizado que sube archivos directamente desde el frontend a S3, reduciendo carga en el backend y mejorando la experiencia de usuario.

**Características clave:**
- URLs prefirmadas para seguridad
- Subida directa a S3 (no pasa por backend)
- Rate limiting para prevenir abuso
- Validaciones robustas
- Código limpio y mantenible

---

**Estado:** ✅ **COMPLETADO**

**Fecha de implementación:** 30 de Octubre, 2025  
**Versión:** 1.0.0  
**Autor:** Backend Team - ClinicaPeru
