# Implementación de URLs de S3 para profileImage

## 📋 Resumen

Se implementó la transformación automática del atributo `profileImage` de la entidad `User` a URLs válidas de AWS S3 en todos los endpoints que retornan información de usuarios (pacientes, doctores, etc.).

## 🎯 Problema Solucionado

Antes de esta implementación, los endpoints retornaban el atributo `profileImage` como un **key de S3** (ejemplo: `profile-images/default-doctors/doctor5.webp`), lo cual no permitía al frontend mostrar correctamente las imágenes de perfil.

Ahora, todos los endpoints retornan **URLs prefirmadas de S3** válidas y funcionales que expiran en 1 hora (ejemplo: `https://s3.amazonaws.com/bucket/profile-images/...?signature=...`).

## 🔧 Servicios Modificados

### 1. **PatientsService** (`src/patients/patients.service.ts`)

#### Endpoints afectados:
- `GET /patients/my-doctors` - Lista de doctores que atendieron al paciente
- `GET /admin/patients` - Lista de todos los pacientes (ADMIN)
- `GET /admin/patients/:id` - Detalle de un paciente (ADMIN)

#### Cambios realizados:
- ✅ Agregado `S3Service` como dependencia
- ✅ Implementado método privado `generateProfileImageUrl()`
- ✅ Transformación de `profileImage` en los tres endpoints principales
- ✅ Actualizado `PatientsModule` para importar `S3Module`

```typescript
// Método helper agregado
private async generateProfileImageUrl(
  profileImage: string | null,
): Promise<string | null> {
  if (!profileImage) return null;
  try {
    const signedUrl = await this.s3Service.generateDownloadUrl(
      profileImage,
      3600, // 1 hora de expiración
    );
    return signedUrl;
  } catch {
    return null;
  }
}
```

### 2. **UsersService** (`src/users/users.service.ts`)

#### Endpoints afectados:
- `GET /users/search` - Búsqueda de usuarios

#### Cambios realizados:
- ✅ Transformación de `profileImage` en el método `searchUsers()`
- ✅ Manejo de errores con fallback a `undefined`

**Nota:** Este servicio ya tenía implementada la transformación S3 en:
- `GET /users/profile` - Perfil del usuario autenticado ✅
- `PATCH /users/profile` - Actualización de perfil ✅

### 3. **DoctorsService** (`src/doctors/doctors.service.ts`)

#### Endpoints afectados:
- `GET /doctors/clinic/:clinicId` - Lista de doctores por clínica
- `GET /doctors/specialty/:specialtyId` - Lista de doctores por especialidad

#### Cambios realizados:
- ✅ Implementado uso de `generateProfileImageUrl()` en ambos métodos
- ✅ Transformación asíncrona con `Promise.all()`

**Nota:** Este servicio ya tenía implementada la transformación S3 en:
- `GET /doctors/:id` - Detalle de un doctor ✅
- `GET /doctors` - Lista de todos los doctores ✅
- `GET /public/doctors` - Lista pública de doctores ✅
- `GET /public/doctors/:id` - Detalle público de un doctor ✅
- `PUT /doctors/:id` - Actualización de doctor ✅
- `DELETE /doctors/:id` - Eliminación de doctor ✅

### 4. **AppointmentsService** (`src/appointments/appointments.service.ts`)

#### Endpoints afectados:
- `GET /appointments/my-appointments` - Citas del usuario autenticado

#### Cambios realizados:
- ✅ Agregado `S3Service` como dependencia
- ✅ Transformación de `profileImage` del doctor en cada cita
- ✅ Actualizado `AppointmentsModule` para importar `S3Module`

```typescript
// Transformación implementada
const appointmentsWithUrls = await Promise.all(
  appointments.map(async (appointment) => {
    if (appointment.doctor?.user?.profileImage) {
      const profileImageUrl = await this.s3Service.generateDownloadUrl(
        appointment.doctor.user.profileImage,
        3600,
      );
      return {
        ...appointment,
        doctor: {
          ...appointment.doctor,
          user: {
            ...appointment.doctor.user,
            profileImage: profileImageUrl,
          },
        },
      };
    }
    return appointment;
  }),
);
```

## 📦 Módulos Actualizados

Se actualizaron los siguientes módulos para importar `S3Module`:

1. ✅ `PatientsModule` (`src/patients/patients.module.ts`)
2. ✅ `AppointmentsModule` (`src/appointments/appointments.module.ts`)

**Nota:** Los siguientes módulos ya tenían `S3Module` importado:
- ✅ `UsersModule`
- ✅ `DoctorsModule`

## 🎨 Patrón de Implementación

Todos los servicios siguen el mismo patrón consistente:

### 1. Importar S3Service
```typescript
import { S3Service } from 'src/common/s3/s3.service';
```

### 2. Inyectar en el constructor
```typescript
constructor(
  // ... otras dependencias
  private readonly s3Service: S3Service,
) {}
```

### 3. Método helper privado
```typescript
private async generateProfileImageUrl(
  profileImage: string | null,
): Promise<string | null> {
  if (!profileImage) return null;
  try {
    const signedUrl = await this.s3Service.generateDownloadUrl(
      profileImage,
      3600, // Tiempo de expiración en segundos
    );
    return signedUrl;
  } catch {
    return null; // Si falla, retornar null
  }
}
```

### 4. Uso en métodos que retornan datos
```typescript
// Para objetos individuales
const profileImageUrl = await this.generateProfileImageUrl(
  user.profileImage,
);

// Para arrays con Promise.all()
const results = await Promise.all(
  users.map(async (user) => {
    const profileImageUrl = await this.generateProfileImageUrl(
      user.profileImage,
    );
    return {
      ...user,
      profileImage: profileImageUrl,
    };
  }),
);
```

## ⚙️ Configuración S3

El servicio S3 utiliza las siguientes variables de entorno:

```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=proyecto-clinica-fabrizio-2025
```

## 🔐 Seguridad

- Las URLs generadas son **prefirmadas (presigned URLs)**
- Tiempo de expiración: **3600 segundos (1 hora)**
- Si la generación de URL falla, se retorna `null` sin romper el endpoint
- No se exponen las credenciales de AWS en las respuestas

## ✅ Endpoints Verificados

### **Usuarios**
- ✅ `GET /users/profile` - Perfil del usuario
- ✅ `GET /users/search` - Búsqueda de usuarios
- ✅ `PATCH /users/profile` - Actualización de perfil

### **Doctores**
- ✅ `GET /doctors` - Lista de doctores
- ✅ `GET /doctors/:id` - Detalle de doctor
- ✅ `GET /doctors/clinic/:clinicId` - Doctores por clínica
- ✅ `GET /doctors/specialty/:specialtyId` - Doctores por especialidad
- ✅ `GET /public/doctors` - Lista pública
- ✅ `GET /public/doctors/:id` - Detalle público
- ✅ `PUT /doctors/:id` - Actualización
- ✅ `DELETE /doctors/:id` - Eliminación

### **Pacientes**
- ✅ `GET /patients/my-doctors` - Mis doctores
- ✅ `GET /admin/patients` - Lista de pacientes (ADMIN)
- ✅ `GET /admin/patients/:id` - Detalle de paciente (ADMIN)

### **Citas**
- ✅ `GET /appointments/my-appointments` - Mis citas

## 🧪 Testing

Para verificar que funciona correctamente:

1. **Iniciar el backend:**
   ```bash
   npm run start:dev
   ```

2. **Hacer peticiones a los endpoints:**
   ```bash
   # Ejemplo: Obtener perfil
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/users/profile
   ```

3. **Verificar el formato de la respuesta:**
   ```json
   {
     "id": "uuid",
     "firstName": "Juan",
     "lastName": "Pérez",
     "profileImage": "https://proyecto-clinica-fabrizio-2025.s3.us-east-1.amazonaws.com/profile-images/...?X-Amz-Algorithm=..."
   }
   ```

## 🚀 Próximos Pasos Recomendados

1. ✅ **Completado** - Implementar transformación en todos los endpoints principales
2. 🔄 **Opcional** - Considerar cachear URLs de S3 en Redis para reducir llamadas a AWS
3. 🔄 **Opcional** - Implementar un job que regenere URLs antes de que expiren
4. 🔄 **Opcional** - Agregar tests unitarios para `generateProfileImageUrl()`

## 📝 Notas Importantes

- **URLs Temporales:** Las URLs de S3 expiran después de 1 hora. El frontend debe refrescar la data periódicamente.
- **Imágenes por Defecto:** Si el usuario no tiene imagen, el atributo será `null`. El frontend debe mostrar un avatar por defecto.
- **Rendimiento:** La generación de URLs es asíncrona pero optimizada con `Promise.all()` para múltiples usuarios.
- **Manejo de Errores:** Si AWS S3 falla, el endpoint continúa funcionando retornando `null` en el campo `profileImage`.
