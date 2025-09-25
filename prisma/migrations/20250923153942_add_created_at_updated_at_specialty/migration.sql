-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'PATIENT', 'DOCTOR');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "public"."SlotStatus" AS ENUM ('FREE', 'HELD', 'BOOKED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ATTENDED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "names" TEXT NOT NULL,
    "fatherSurname" TEXT NOT NULL,
    "motherSurname" TEXT NOT NULL,
    "dayOfBirth" TIMESTAMP(3) NOT NULL,
    "phone" TEXT,
    "gender" "public"."Gender" NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'PATIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "ubigeoDept" TEXT,
    "ubigeoProv" TEXT,
    "ubigeoDist" TEXT,
    "phone" TEXT,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Room" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" TEXT,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Specialty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Doctor" (
    "id" TEXT NOT NULL,
    "cmp" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Schedule" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotMinutes" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Slot" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."SlotStatus" NOT NULL DEFAULT 'FREE',
    "holdExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Appointment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "status" "public"."AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "attendedAt" TIMESTAMP(3),

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DoctorUnavailability" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "DoctorUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_dni_key" ON "public"."User"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_name_key" ON "public"."Clinic"("name");

-- CreateIndex
CREATE INDEX "Clinic_name_idx" ON "public"."Clinic"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Room_clinicId_name_key" ON "public"."Room"("clinicId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_name_key" ON "public"."Specialty"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_cmp_key" ON "public"."Doctor"("cmp");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_userId_key" ON "public"."Doctor"("userId");

-- CreateIndex
CREATE INDEX "Doctor_cmp_idx" ON "public"."Doctor"("cmp");

-- CreateIndex
CREATE INDEX "Doctor_specialtyId_clinicId_idx" ON "public"."Doctor"("specialtyId", "clinicId");

-- CreateIndex
CREATE INDEX "Schedule_doctorId_dayOfWeek_idx" ON "public"."Schedule"("doctorId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Slot_status_startAt_idx" ON "public"."Slot"("status", "startAt");

-- CreateIndex
CREATE INDEX "Slot_startAt_idx" ON "public"."Slot"("startAt");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_scheduleId_startAt_key" ON "public"."Slot"("scheduleId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_slotId_key" ON "public"."Appointment"("slotId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_createdAt_idx" ON "public"."Appointment"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "Appointment_userId_createdAt_idx" ON "public"."Appointment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DoctorUnavailability_doctorId_startAt_endAt_idx" ON "public"."DoctorUnavailability"("doctorId", "startAt", "endAt");

-- AddForeignKey
ALTER TABLE "public"."Room" ADD CONSTRAINT "Room_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Doctor" ADD CONSTRAINT "Doctor_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "public"."Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Doctor" ADD CONSTRAINT "Doctor_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Doctor" ADD CONSTRAINT "Doctor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Schedule" ADD CONSTRAINT "Schedule_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Slot" ADD CONSTRAINT "Slot_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "public"."Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoctorUnavailability" ADD CONSTRAINT "DoctorUnavailability_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
