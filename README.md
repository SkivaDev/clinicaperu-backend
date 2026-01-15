<div align="center">

# 🏥 Clínica Perú - Backend API

[![NestJS](https://img.shields.io/badge/NestJS-11.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.14-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://docs.bullmq.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

**API REST robusta y escalable para gestión integral de clínicas médicas**

[Ver Demo en Swagger](https://api.clinicaperu.org/api/docs) · [Reportar Bug](https://github.com/SkivaDev/clinicaperu-backend/issues) · [Frontend Repository](https://github.com/SkivaDev/clinicaperu-frontend)

</div>

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Características Principales](#-características-principales)
- [Arquitectura](#-arquitectura)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Modelo de Datos](#-modelo-de-datos)
- [Seguridad](#-seguridad)
- [Instalación](#-instalación)
- [Variables de Entorno](#-variables-de-entorno)
- [Documentación API](#-documentación-api)
- [Despliegue](#-despliegue)

---

## 📝 Descripción

**Clínica Perú Backend** es una API REST desarrollada con **NestJS** que proporciona todos los servicios necesarios para la gestión de una clínica médica moderna. Incluye autenticación segura con JWT + Refresh Tokens, gestión de citas con sistema de slots, expedientes médicos con almacenamiento en S3, y procesamiento asíncrono de tareas con BullMQ.

> ⚠️ **Nota sobre el demo:** El backend está desplegado en Render Free Tier. El primer acceso puede tardar ~30 segundos debido al cold start.

---

## ✨ Características Principales

### Gestión de Usuarios y Autenticación

- 🔐 **JWT + Refresh Tokens** con cookies HttpOnly
- 👤 Sistema de roles (Admin, Doctor, Paciente)
- 🔄 Renovación automática de tokens
- 📝 Registro con validación de DNI único

### Gestión de Citas

- 📅 Sistema de **slots dinámicos** con estados (FREE, HELD, BOOKED, BLOCKED)
- ⏰ **Hold temporal** de slots (reserva por 10 minutos)
- 📊 Generación automática de slots por horarios médicos
- 🔔 Notificaciones por email (confirmación, cancelación, recordatorios)

### Expedientes Médicos

- 📁 Almacenamiento seguro de archivos en **AWS S3**
- 📋 Historial médico completo por paciente
- 📊 Registro de signos vitales
- 🔒 Logs de acceso para auditoría HIPAA

### Pagos y Reportes

- 💳 Sistema de pagos simulado (listo para integrar pasarelas reales)
- 📈 Dashboard con analíticas y KPIs
- 📊 Reportes exportables

### Infraestructura

- 📧 **Cola de emails** con BullMQ + Redis
- ⏱️ **Cron Jobs** para limpieza de slots expirados
- 🛡️ Rate limiting multi-nivel
- 📖 Documentación Swagger completa

---

## 🏗 Arquitectura

[![](https://mermaid.ink/img/pako:eNp9lF2PojAUhv8K6ZWTOAZG_OJiE1R0nRVFijG7dS460lVXtKSUzDjG_76H4o6i7nBD-5y355Rz3nBACx4yZKGloPFKC9rznQZPkr7moBOt2U6ynGZPzyE9wQHtQm3E3mXlT_KSR4HMd1fH58j2BtqQ7pmYo3OS_oxkvE8le6P7l3MAzwh-o8slE1qXL77OPGKJfMZamy42meAivT0NvhM7lSvN5WEasYsCU-z4mEwTJpLbYHfcCcYQhtKS3xN4djBwRgEmHpVZX-5IbM8LiB3HfL2T2_sSPBxDChzxe0HX6Q469pC4LFwvaKT5bMFFmBQu8dM9XWL_nwq-4419UPgs5uJacL-bWRuXgqcw1mf-mly2czJ1pg5pp1HkTrRJytLLUo5rD4bE2dJ1pM242DBxEQxs_AO-dLFiWf1QC2iy-XqoXSrprV-8Pil5PJFLwfBk-FD40u4Ak5IP3UouOa6Skj3D8H64rddztMfHb-DCfNufqW3mmgLAp3gWUECZJ2dqqaDXz8nJPAX2zy8FmDkkz5_5IGdqWVCdfJALq7fsXCJ3QwGe5v_JrgqrgeZMLRVUnbyGaro5VLM83xuV4ZexDpH1m0YJK6MtE-AB2KNDpp8juWJbNkcWLEMqNtk4j3AoprtfnG-RJUUKx8Bxy9VnkjQO4ZfQXVOww1kCk2OiA9aUyDKapsqBrAN6R1a9VmmZdd3Um1WjZdSaT2W0B9GTXjEbNUM3G6ah182aeSyjD1VVB33LrAIGtVFrVGvHvwyrbUM?type=png)](https://mermaid.live/edit#pako:eNp9lF2PojAUhv8K6ZWTOAZG_OJiE1R0nRVFijG7dS460lVXtKSUzDjG_76H4o6i7nBD-5y355Rz3nBACx4yZKGloPFKC9rznQZPkr7moBOt2U6ynGZPzyE9wQHtQm3E3mXlT_KSR4HMd1fH58j2BtqQ7pmYo3OS_oxkvE8le6P7l3MAzwh-o8slE1qXL77OPGKJfMZamy42meAivT0NvhM7lSvN5WEasYsCU-z4mEwTJpLbYHfcCcYQhtKS3xN4djBwRgEmHpVZX-5IbM8LiB3HfL2T2_sSPBxDChzxe0HX6Q469pC4LFwvaKT5bMFFmBQu8dM9XWL_nwq-4419UPgs5uJacL-bWRuXgqcw1mf-mly2czJ1pg5pp1HkTrRJytLLUo5rD4bE2dJ1pM242DBxEQxs_AO-dLFiWf1QC2iy-XqoXSrprV-8Pil5PJFLwfBk-FD40u4Ak5IP3UouOa6Skj3D8H64rddztMfHb-DCfNufqW3mmgLAp3gWUECZJ2dqqaDXz8nJPAX2zy8FmDkkz5_5IGdqWVCdfJALq7fsXCJ3QwGe5v_JrgqrgeZMLRVUnbyGaro5VLM83xuV4ZexDpH1m0YJK6MtE-AB2KNDpp8juWJbNkcWLEMqNtk4j3AoprtfnG-RJUUKx8Bxy9VnkjQO4ZfQXVOww1kCk2OiA9aUyDKapsqBrAN6R1a9VmmZdd3Um1WjZdSaT2W0B9GTXjEbNUM3G6ah182aeSyjD1VVB33LrAIGtVFrVGvHvwyrbUM)

### Patrones Implementados

| Patrón                   | Uso                                             |
| ------------------------ | ----------------------------------------------- |
| **Modular Architecture** | Cada dominio en su propio módulo NestJS         |
| **Repository Pattern**   | Prisma como ORM con servicios de acceso a datos |
| **DTO Pattern**          | Validación de entrada con class-validator       |
| **Guard Pattern**        | Protección de rutas con JWT y roles             |
| **Queue Pattern**        | Procesamiento asíncrono con BullMQ              |
| **Decorator Pattern**    | Decoradores personalizados para auth y roles    |

---

## 🛠 Stack Tecnológico

### Core

| Tecnología     | Versión | Propósito               |
| -------------- | ------- | ----------------------- |
| **NestJS**     | 11.0    | Framework backend       |
| **TypeScript** | 5.7     | Tipado estático         |
| **Prisma**     | 6.14    | ORM y migraciones       |
| **PostgreSQL** | 16      | Base de datos principal |

### Seguridad y Auth

| Tecnología            | Propósito                    |
| --------------------- | ---------------------------- |
| **Passport.js**       | Estrategias de autenticación |
| **JWT**               | Tokens de acceso             |
| **bcrypt**            | Hash de contraseñas          |
| **Helmet**            | Headers de seguridad HTTP    |
| **@nestjs/throttler** | Rate limiting                |

### Background Processing

| Tecnología           | Propósito        |
| -------------------- | ---------------- |
| **BullMQ**           | Cola de tareas   |
| **Redis/Upstash**    | Backend de colas |
| **@nestjs/schedule** | Cron jobs        |

### Storage & Email

| Tecnología | Propósito                          |
| ---------- | ---------------------------------- |
| **AWS S3** | Almacenamiento de archivos médicos |
| **Resend** | Envío de emails transaccionales    |

### DevOps

| Tecnología | Propósito             |
| ---------- | --------------------- |
| **Docker** | Containerización      |
| **Render** | Hosting backend       |
| **Neon**   | PostgreSQL serverless |

---

## 📁 Estructura del Proyecto

```
src/
├── admin/              # Endpoints de administración
├── appointments/       # Gestión de citas médicas
├── auth/               # Autenticación JWT + Refresh Tokens
│   ├── decorators/     # @CurrentUser, @Public, @Roles
│   ├── guards/         # JwtAuthGuard, RolesGuard
│   └── strategies/     # JWT Strategy, Local Strategy
├── availability/       # API pública de disponibilidad
├── calendar/           # Vista de calendario para doctores
├── clinics/            # CRUD de clínicas
├── common/             # Utilidades compartidas
├── doctors/            # Gestión de médicos
├── email/              # Servicio de emails con colas
├── medical-records/    # Expedientes médicos + S3
├── patients/           # Gestión de pacientes
├── payments/           # Sistema de pagos
├── prisma/             # Prisma service
├── queue/              # Configuración BullMQ
├── reports/            # Analíticas y dashboards
├── rooms/              # Gestión de consultorios
├── schedules/          # Horarios de doctores
├── slots/              # Sistema de slots de citas
├── specialties/        # Especialidades médicas
├── tasks/              # Cron jobs
├── unavailability/     # Bloqueos de agenda
├── uploads/            # Servicio de carga a S3
├── users/              # Gestión de usuarios
├── app.module.ts       # Módulo principal
└── main.ts             # Bootstrap de la aplicación
```

---

## 🗄 Modelo de Datos

[![](https://mermaid.ink/img/pako:eNp1kk1vozAQhv-KNeekggbywa1Kjq1UtdvLKhfHnoIV40HGdDcb8t_XOOSzlJuZ552Pd2YPgiRCBmhXiueWl2vD_PdRo2VtOx5Ty1YkHFmWsTWoeg33wJ49VRUp40o0LlAbou0g-IafFuviF23RBLLgg9wLSiW4fkNBVgZQWOQOA3zE-6Z6wbsoUDYa75PeUvd9cufQyB_g4-vD8C-uNN8ordzuh_QHGo_blr1XKBTXPbZBTSavmaNheqmVUSKgf8hua8bdZbo-eLKNqLwufWTOM5880HQcK0eD9uRWILtIv8x7DwrS8irpdbhXvPLdhb7MPkB-X9tNw7fhoVU_CYF1_Ux5EDvLRXdHMILcKgnZJ9c1jqBEW_LuDfsusQcLLHENnUZyu-0qHryo4ua3dw4yZxsvs9TkxTlJU0lvUX_zZ8SfA9olNcZBFs_nIQdke_gL2TR9WCTTKInmk3gRp_PHEew89Bg9JLM0jpJZEkfTJE0OI_gXqkaeXyQT_9vTcTqbpIf_dF4aqw?type=png)](https://mermaid.live/edit#pako:eNp1kk1vozAQhv-KNeekggbywa1Kjq1UtdvLKhfHnoIV40HGdDcb8t_XOOSzlJuZ552Pd2YPgiRCBmhXiueWl2vD_PdRo2VtOx5Ty1YkHFmWsTWoeg33wJ49VRUp40o0LlAbou0g-IafFuviF23RBLLgg9wLSiW4fkNBVgZQWOQOA3zE-6Z6wbsoUDYa75PeUvd9cufQyB_g4-vD8C-uNN8ordzuh_QHGo_blr1XKBTXPbZBTSavmaNheqmVUSKgf8hua8bdZbo-eLKNqLwufWTOM5880HQcK0eD9uRWILtIv8x7DwrS8irpdbhXvPLdhb7MPkB-X9tNw7fhoVU_CYF1_Ux5EDvLRXdHMILcKgnZJ9c1jqBEW_LuDfsusQcLLHENnUZyu-0qHryo4ua3dw4yZxsvs9TkxTlJU0lvUX_zZ8SfA9olNcZBFs_nIQdke_gL2TR9WCTTKInmk3gRp_PHEew89Bg9JLM0jpJZEkfTJE0OI_gXqkaeXyQT_9vTcTqbpIf_dF4aqw)

### Entidades Principales

| Entidad           | Descripción                                                    |
| ----------------- | -------------------------------------------------------------- |
| **User**          | Usuarios del sistema (pacientes, doctores, admins)             |
| **Doctor**        | Información profesional del médico (CMP, especialidad, precio) |
| **Appointment**   | Citas médicas con estados y tracking                           |
| **Slot**          | Bloques de tiempo para citas                                   |
| **MedicalRecord** | Expedientes con diagnóstico, recetas y archivos                |
| **Payment**       | Transacciones de pago                                          |

---

## 🔒 Seguridad

### Autenticación JWT + Refresh Tokens

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE AUTENTICACIÓN                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Login → Access Token (15min) + Refresh Token (7 días)  │
│                                                             │
│  2. Request → Authorization: Bearer {accessToken}          │
│                                                             │
│  3. Token expirado → /auth/refresh con Refresh Token       │
│                                                             │
│  4. Logout → Revocación de todos los refresh tokens        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Rate Limiting

| Nivel               | Límite          | Protección       |
| ------------------- | --------------- | ---------------- |
| **Global (short)**  | 10 req/seg      | Burst protection |
| **Global (medium)** | 100 req/min     | Uso normal       |
| **Global (long)**   | 500 req/15min   | Sustained abuse  |
| **Login**           | 10 intentos/min | Brute force      |
| **Register**        | 5 registros/min | Spam prevention  |

### Otras Medidas

- ✅ **Helmet** - Headers de seguridad HTTP
- ✅ **CORS** - Orígenes permitidos configurables
- ✅ **Validación** - DTOs con class-validator
- ✅ **Sanitización** - whitelist + forbidNonWhitelisted
- ✅ **Cookies HttpOnly** - Protección XSS
- ✅ **Logs de acceso** - Auditoría para expedientes médicos

---

## 🚀 Instalación

### Prerrequisitos

- Node.js 20+
- pnpm 8+
- PostgreSQL 14+ (o cuenta en Neon)
- Redis (o cuenta en Upstash)

### Instalación Local

```bash
# Clonar repositorio
git clone git@github.com:SkivaDev/clinicaperu-backend.git
cd clinicaperu-backend

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Generar cliente Prisma y ejecutar migraciones
pnpm prisma generate
pnpm prisma migrate dev

# Iniciar en modo desarrollo
pnpm run start:dev
```

### Con Docker

```bash
# Levantar todo el stack
docker-compose up -d

# Ver logs
docker-compose logs -f backend
```

---

## ⚙️ Variables de Entorno

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/clinicaperu"

# Redis (para BullMQ)
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="tu-secret-muy-seguro"

# Frontend URL (CORS)
FRONTEND_URL="http://localhost:3000"

# Email (Resend)
EMAIL_PROVIDER="resend"
RESEND_API_KEY="re_xxxxx"
RESEND_FROM_EMAIL="noreply@tudominio.com"

# AWS S3 (archivos médicos)
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
S3_BUCKET_NAME="clinicaperu-medical-files"
```

---

## 📖 Documentación API

### Swagger UI

```
https://api.clinicaperu.org/api/docs
```

La documentación interactiva incluye:

- 📋 Todos los endpoints organizados por módulo
- 🔐 Autenticación con Bearer Token y Cookies
- 📝 Schemas de request/response
- 🧪 Testing integrado con "Try it out"

### Endpoints Principales

| Método | Endpoint                      | Descripción               |
| ------ | ----------------------------- | ------------------------- |
| `POST` | `/api/auth/register`          | Registro de usuario       |
| `POST` | `/api/auth/login`             | Login con email/password  |
| `POST` | `/api/auth/refresh`           | Renovar tokens            |
| `GET`  | `/api/doctors`                | Listar doctores           |
| `GET`  | `/api/availability/:doctorId` | Obtener slots disponibles |
| `POST` | `/api/bookings`               | Crear cita                |
| `GET`  | `/api/appointments/my`        | Mis citas (paciente)      |
| `GET`  | `/api/medical-records/:id`    | Ver expediente médico     |

---

## 🐳 Despliegue

### Despliegue en Render (Free Tier)

Este proyecto está optimizado para el tier gratuito de Render:

| Servicio   | Plataforma | Costo  |
| ---------- | ---------- | ------ |
| Backend    | Render     | $0/mes |
| PostgreSQL | Neon       | $0/mes |
| Redis      | Upstash    | $0/mes |

**Dockerfile incluido** con:

- Multi-stage build (imagen final ~150MB)
- Usuario non-root para seguridad
- Health check integrado
- Migraciones automáticas

```bash
# Deploy manual
git push origin main  # Render detecta y despliega automáticamente
```

---

## 🧪 Testing

```bash
# Tests unitarios
pnpm run test

# Tests e2e
pnpm run test:e2e

# Coverage
pnpm run test:cov

# Test rate limiting
./test-rate-limiting.ps1  # Windows
./test-rate-limiting.sh   # Linux/Mac
```

---

## 📞 Contacto

**Fabrizio Ortiz Orellana** - [@fabrizioortiz](https://www.linkedin.com/in/fabri-ort-orellana/) - fabrizioortizo.main@gmail.com

Link del proyecto: [https://github.com/SkivaDev/clinicaperu-backend](https://github.com/SkivaDev/clinicaperu-backend)

---

<div align="center">

**⭐ Si este proyecto te fue útil, considera darle una estrella ⭐**

</div>
