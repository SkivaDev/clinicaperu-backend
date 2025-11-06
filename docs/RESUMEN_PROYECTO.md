# Resumen del Proyecto: ClinicaPeru Backend

## 📋 Información General

**Nombre del Proyecto:** clinicaperu-backend  
**Versión:** 0.0.1  
**Framework:** NestJS 11.x  
**Lenguaje:** TypeScript  
**Base de Datos:** PostgreSQL (vía Prisma ORM)  
**Puerto:** 3000 (configurable)  
**CORS Habilitado:** http://localhost:4321

---

## 🎯 Propósito del Proyecto

Sistema backend para la gestión integral de una clínica médica en Perú. Permite administrar:
- **Usuarios** (pacientes, doctores, administradores)
- **Citas médicas** (appointments)
- **Horarios de doctores** (schedules)
- **Slots de disponibilidad** (slots)
- **Clínicas y salas** (clinics, rooms)
- **Especialidades médicas** (specialties)
- **Calendario de eventos**

---

## 🏗️ Arquitectura del Proyecto

### Stack Tecnológico

#### Backend
- **NestJS 11.0.1** - Framework principal
- **TypeScript 5.7.3** - Lenguaje de programación
- **Prisma 6.14.0** - ORM para PostgreSQL
- **Passport.js** - Autenticación (JWT + Local Strategy)
- **bcrypt 6.0.0** - Hash de contraseñas
- **class-validator & class-transformer** - Validación de DTOs

#### Base de Datos
- **PostgreSQL** (vía Docker)
- **Puerto:** 5435 (mapeado desde 5432)
- **Nombre BD:** clinica-peru-db
- **Usuario:** skivadev
- **Contraseña:** root

#### Herramientas de Desarrollo
- **ESLint 9.18.0** - Linting
- **Prettier 3.4.2** - Formateo de código
- **Jest 30.0.0** - Testing
- **Docker Compose** - Contenedorización de PostgreSQL

---

## 📦 Módulos Principales

### 1. **AuthModule** (`src/auth/`)
**Responsabilidad:** Autenticación y autorización de usuarios

**Endpoints:**
- `POST /auth/register` - Registro de nuevos usuarios
- `POST /auth/login` - Login con JWT
- `GET /auth/profile` - Obtener perfil del usuario autenticado
- `GET /auth/admin/dashboard` - Dashboard para administradores (requiere rol ADMIN)
- `GET /auth/patient/dashboard` - Dashboard para pacientes (requiere rol PATIENT)

**Características:**
- Autenticación basada en JWT
- Guards: `JwtAuthGuard`, `LocalAuthGuard`, `RolesGuard`
- Decoradores personalizados: `@CurrentUser()`, `@Roles()`
- Estrategias: Local Strategy, JWT Strategy
- Cookies habilitadas para tokens

---

### 2. **UsersModule** (`src/users/`)
**Responsabilidad:** Gestión de usuarios del sistema

**Características:**
- CRUD de usuarios
- Roles: ADMIN, PATIENT, DOCTOR
- Información personal: DNI, email, nombre, apellido, fecha de nacimiento, género, teléfono
- Relación 1:1 con Doctor (si el usuario es doctor)
- Soft delete (campo `isActive`)

---

### 3. **DoctorsModule** (`src/doctors/`)
**Responsabilidad:** Gestión de doctores

**Endpoints (todos requieren rol ADMIN):**
- `POST /admin/doctors` - Crear doctor
- `GET /admin/doctors` - Listar todos los doctores
- `GET /admin/doctors/:id` - Obtener detalle de un doctor
- `GET /admin/doctors/:id/ids` - Obtener IDs del doctor
- `PATCH /admin/doctors/:id` - Actualizar doctor
- `DELETE /admin/doctors/:id` - Eliminar doctor

**Características:**
- CMP (Código de colegiatura médico) único
- Relación con Specialty (especialidad)
- Relación con Clinic (clínica donde trabaja)
- Métricas: años de experiencia, precio de consulta, citas atendidas, pacientes atendidos, rating
- Relación con Schedule (horarios de atención)
- Relación con Appointment (citas)
- Indisponibilidades (DoctorUnavailability)

---

### 4. **SchedulesModule** (`src/schedules/`)
**Responsabilidad:** Gestión de horarios de atención de doctores

**Endpoints:**
- `GET /admin/doctors/:doctorId/schedules` - Obtener horarios de un doctor
- `PATCH /admin/doctors/:doctorId/schedules` - Actualizar horarios
- `POST /admin/doctors/:doctorId/schedules/regenerate-slots` - Regenerar slots
- `GET /admin/doctors/:doctorId/schedules/statistics` - Estadísticas de horarios
- `GET /admin/doctors/:doctorId/schedules/all` - Todos los horarios (incluidos inactivos)
- `GET /admin/doctors/:doctorId/schedules/inactive` - Horarios inactivos
- `DELETE /admin/doctors/:doctorId/schedules/:scheduleId` - Desactivar horario
- `POST /admin/doctors/:doctorId/schedules/:scheduleId/reactivate` - Reactivar horario

**Características:**
- Horarios por día de la semana (0=Domingo, 6=Sábado)
- Hora de inicio y fin (formato "HH:mm")
- Duración de slots en minutos
- Fechas efectivas (effectiveFrom, effectiveTo)
- Generación automática de slots
- Soft delete

---

### 5. **SlotsModule** (`src/slots/`)
**Responsabilidad:** Gestión de slots de disponibilidad para citas

**Endpoints:**
- `GET /slots` - Obtener slots disponibles (con filtros)
- `GET /slots/doctor/:doctorId` - Slots de un doctor específico
- `GET /slots/schedule/:scheduleId` - Slots de un horario específico
- `GET /slots/statistics/doctor/:doctorId` - Estadísticas de slots
- `GET /slots/:slotId/check-availability` - Verificar disponibilidad de un slot
- `GET /slots/:slotId` - Obtener slot por ID

**Estados de Slot:**
- `FREE` - Disponible
- `HELD` - Reservado temporalmente (con expiración)
- `BOOKED` - Reservado definitivamente
- `BLOCKED` - Bloqueado

**Características:**
- Filtros: doctorId, scheduleId, startDate, endDate, status, isActive
- Verificación de disponibilidad
- Estadísticas detalladas
- Relación 1:1 con Appointment

---

### 6. **AppointmentsModule** (`src/appointments/`)
**Responsabilidad:** Gestión de citas médicas

**Endpoints:**
- `GET /appointments` - Listar todas las citas (requiere autenticación)
- `GET /appointments/:id` - Obtener cita por ID

**Estados de Cita:**
- `PENDING` - Pendiente
- `CONFIRMED` - Confirmada
- `ATTENDED` - Atendida
- `CANCELLED` - Cancelada
- `NO_SHOW` - No asistió

**Características:**
- Relación con User (paciente)
- Relación con Doctor
- Relación con Slot (1:1)
- Campos: reason, notes, confirmedAt, cancelledAt, attendedAt
- Roles permitidos: PATIENT, DOCTOR, ADMIN

---

### 7. **ClinicsModule** (`src/clinics/`)
**Responsabilidad:** Gestión de clínicas

**Características:**
- Nombre único
- Dirección con Ubigeo (departamento, provincia, distrito)
- Contacto: teléfono, email
- Relación con Room (salas)
- Relación con Doctor (doctores que trabajan ahí)
- Soft delete

---

### 8. **RoomsModule** (`src/rooms/`)
**Responsabilidad:** Gestión de salas/consultorios

**Tipos de Sala:**
- `CONSULTATION` - Consultorio
- `SURGERY` - Cirugía
- `EMERGENCY` - Emergencia
- `ICU` - Cuidados intensivos
- `LABORATORY` - Laboratorio
- `RADIOLOGY` - Radiología

**Características:**
- Número de sala y nombre
- Piso
- Capacidad
- Equipamiento (array de strings)
- Relación con Clinic
- Constraint único: (clinicId, name)

---

### 9. **SpecialtiesModule** (`src/specialties/`)
**Responsabilidad:** Gestión de especialidades médicas

**Características:**
- Nombre único
- Descripción opcional
- Relación con Doctor
- Soft delete

---

### 10. **CalendarModule** (`src/calendar/`)
**Responsabilidad:** Vista de calendario de eventos

**Características:**
- Integración con citas
- Eventos del calendario

---

### 11. **AdminModule** (`src/admin/`)
**Responsabilidad:** Funcionalidades administrativas

**Características:**
- Dashboard administrativo
- Gestión de recursos

---

### 12. **PrismaModule** (`src/prisma/`)
**Responsabilidad:** Servicio de conexión a base de datos

**Características:**
- Cliente de Prisma global
- Configuración de conexión a PostgreSQL

---

## 🗄️ Modelo de Datos (Prisma Schema)

### Enums

```typescript
enum Role { ADMIN, PATIENT, DOCTOR }
enum Gender { MALE, FEMALE }
enum SlotStatus { FREE, HELD, BOOKED, BLOCKED }
enum AppointmentStatus { PENDING, CONFIRMED, ATTENDED, CANCELLED, NO_SHOW }
enum RoomType { CONSULTATION, SURGERY, EMERGENCY, ICU, LABORATORY, RADIOLOGY }
```

### Modelos Principales

#### User
- **Campos:** id, dni (único), email (único), passwordHash, firstName, lastName, dayOfBirth, phone, gender, profileImage, role, isActive
- **Relaciones:** 1:1 con Doctor, 1:N con Appointment

#### Doctor
- **Campos:** id, cmp (único), yearsOfExperience, consultationPrice, attendedAppointments, attendedPatients, rating, isActive
- **Relaciones:** N:1 con User, N:1 con Specialty, N:1 con Clinic, 1:N con Schedule, 1:N con Appointment, 1:N con DoctorUnavailability

#### Clinic
- **Campos:** id, name (único), address, ubigeoDept, ubigeoProv, ubigeoDist, phone, email, isActive
- **Relaciones:** 1:N con Room, 1:N con Doctor

#### Room
- **Campos:** id, name, roomNumber, roomType, floor, capacity, equipment[], isActive
- **Relaciones:** N:1 con Clinic
- **Constraints:** Único (clinicId, name)

#### Specialty
- **Campos:** id, name (único), description, isActive
- **Relaciones:** 1:N con Doctor

#### Schedule
- **Campos:** id, dayOfWeek, startTime, endTime, slotMinutes, isActive, effectiveFrom, effectiveTo
- **Relaciones:** N:1 con Doctor, 1:N con Slot

#### Slot
- **Campos:** id, startAt, endAt, status, holdExpiresAt, isActive
- **Relaciones:** N:1 con Schedule, 1:1 con Appointment
- **Constraints:** Único (scheduleId, startAt)

#### Appointment
- **Campos:** id, status, reason, notes, confirmedAt, cancelledAt, attendedAt
- **Relaciones:** N:1 con User, N:1 con Doctor, 1:1 con Slot

#### DoctorUnavailability
- **Campos:** id, startAt, endAt, reason
- **Relaciones:** N:1 con Doctor

---

## 🔐 Seguridad y Autenticación

### Sistema de Autenticación
- **JWT (JSON Web Tokens)** para autenticación stateless
- **Cookies** para almacenar tokens
- **bcrypt** para hash de contraseñas

### Guards Implementados
1. **JwtAuthGuard** - Verifica token JWT válido
2. **LocalAuthGuard** - Valida credenciales en login
3. **RolesGuard** - Verifica roles de usuario

### Decoradores Personalizados
- `@CurrentUser()` - Obtiene el usuario actual del request
- `@Roles(...roles)` - Define roles permitidos para un endpoint

### Sistema de Roles
- **ADMIN** - Acceso completo al sistema
- **DOCTOR** - Acceso a funcionalidades de doctor
- **PATIENT** - Acceso a funcionalidades de paciente

---

## 🛠️ Configuración y Ejecución

### Variables de Entorno (.env)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/clinicaperu?schema=public"
PORT=3000
JWT_SECRET=your-secret-key
```

### Instalación
```bash
pnpm install
```

### Base de Datos
```bash
# Iniciar PostgreSQL con Docker
docker-compose up -d

# Ejecutar migraciones
npx prisma migrate dev

# Generar cliente Prisma
npx prisma generate
```

### Ejecución
```bash
# Desarrollo
pnpm run start:dev

# Producción
pnpm run build
pnpm run start:prod
```

### Testing
```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Coverage
pnpm run test:cov
```

---

## 📁 Estructura de Directorios

```
clinicaperu-backend/
├── src/
│   ├── admin/              # Módulo de administración
│   ├── appointments/       # Gestión de citas
│   ├── auth/              # Autenticación y autorización
│   ├── calendar/          # Vista de calendario
│   ├── clinics/           # Gestión de clínicas
│   ├── common/            # DTOs y utilidades comunes
│   ├── doctors/           # Gestión de doctores
│   ├── prisma/            # Servicio de Prisma
│   ├── rooms/             # Gestión de salas
│   ├── schedules/         # Gestión de horarios
│   ├── slots/             # Gestión de slots
│   ├── specialties/       # Gestión de especialidades
│   ├── users/             # Gestión de usuarios
│   ├── app.module.ts      # Módulo raíz
│   └── main.ts            # Punto de entrada
├── prisma/
│   └── schema.prisma      # Esquema de base de datos
├── test/                  # Tests E2E
├── data/                  # Datos de PostgreSQL (Docker volume)
├── docker-compose.yml     # Configuración de Docker
├── package.json           # Dependencias
└── tsconfig.json          # Configuración TypeScript
```

---

## 🔄 Flujos Principales

### 1. Registro de Usuario
1. Usuario envía datos a `POST /auth/register`
2. Sistema valida datos con DTOs
3. Contraseña se hashea con bcrypt
4. Usuario se crea en BD con rol PATIENT por defecto

### 2. Login
1. Usuario envía credenciales a `POST /auth/login`
2. LocalAuthGuard valida credenciales
3. Sistema genera JWT
4. Token se devuelve en respuesta

### 3. Creación de Doctor
1. Admin envía datos a `POST /admin/doctors`
2. Se crea User con rol DOCTOR
3. Se crea registro Doctor vinculado al User
4. Se asigna especialidad y clínica

### 4. Gestión de Horarios
1. Admin actualiza horarios en `PATCH /admin/doctors/:doctorId/schedules`
2. Sistema valida horarios
3. Se regeneran slots automáticamente
4. Slots se crean según configuración (dayOfWeek, startTime, endTime, slotMinutes)

### 5. Reserva de Cita (flujo esperado)
1. Paciente consulta slots disponibles
2. Sistema muestra slots con status FREE
3. Paciente selecciona slot
4. Slot cambia a HELD temporalmente
5. Paciente confirma → Slot cambia a BOOKED y se crea Appointment
6. Si no confirma → Slot vuelve a FREE después de expiración

---

## 📊 Características Destacadas

### Validación de Datos
- **class-validator** para validación automática de DTOs
- **ValidationPipe** global configurado con:
  - `whitelist: true` - Elimina campos no definidos
  - `forbidNonWhitelisted: true` - Rechaza campos extras
  - `transform: true` - Transforma datos automáticamente

### CORS
- Habilitado para `http://localhost:4321`
- Métodos permitidos: GET, HEAD, PUT, PATCH, POST, DELETE
- Credentials habilitados

### Soft Delete
- Mayoría de entidades usan campo `isActive` en lugar de eliminar registros
- Permite auditoría y recuperación de datos

### Índices de Base de Datos
- Optimizados para consultas frecuentes
- Índices en: lastName, firstName+lastName, CMP, specialtyId+clinicId, etc.

### Timestamps Automáticos
- `createdAt` - Fecha de creación
- `updatedAt` - Fecha de última actualización

---

## 🚀 Próximas Funcionalidades (Comentadas en Código)

Varios endpoints están comentados en el código, indicando funcionalidades planificadas:

### AppointmentsController
- `POST /appointments` - Crear cita
- `GET /appointments/calendar` - Eventos de calendario
- `PATCH /appointments/:id/status` - Actualizar estado de cita

### Otras Funcionalidades Potenciales
- Notificaciones por email
- Recordatorios de citas
- Historial médico de pacientes
- Reportes y estadísticas avanzadas
- Sistema de pagos
- Integración con sistemas externos

---

## 📝 Notas Importantes

1. **Puerto de PostgreSQL:** El proyecto usa el puerto 5435 (no el estándar 5432) para evitar conflictos
2. **Gestión de Slots:** Los slots se generan automáticamente al crear/actualizar schedules
3. **Roles:** El sistema está diseñado para 3 roles principales (ADMIN, DOCTOR, PATIENT)
4. **Ubigeo:** Se usa el sistema de Ubigeo peruano (departamento, provincia, distrito)
5. **CMP:** Código de Colegiatura Médica del Perú (único por doctor)
6. **DNI:** Documento Nacional de Identidad (único por usuario)

---

## 🎓 Tecnologías y Conceptos Aplicados

- **Arquitectura Modular** (NestJS)
- **Dependency Injection**
- **Guards y Decoradores Personalizados**
- **DTOs (Data Transfer Objects)**
- **ORM (Prisma)**
- **JWT Authentication**
- **Role-Based Access Control (RBAC)**
- **Soft Delete Pattern**
- **Repository Pattern** (vía Prisma)
- **Validation Pipes**
- **Docker para desarrollo**

---

## 📞 Contacto y Recursos

- **Framework:** [NestJS Documentation](https://docs.nestjs.com)
- **ORM:** [Prisma Documentation](https://www.prisma.io/docs)
- **Base de Datos:** PostgreSQL

---

**Última actualización:** 2025-10-10
