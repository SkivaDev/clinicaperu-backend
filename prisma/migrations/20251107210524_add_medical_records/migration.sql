-- CreateEnum
CREATE TYPE "public"."RecordType" AS ENUM ('CONSULTATION', 'FOLLOW_UP', 'EMERGENCY');

-- CreateTable
CREATE TABLE "public"."MedicalRecord" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordType" "public"."RecordType" NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "prescription" TEXT,
    "notes" TEXT,
    "vitalSigns" JSONB,
    "attachments" JSONB[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MedicalRecordAccessLog" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalRecordAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicalRecord_appointmentId_key" ON "public"."MedicalRecord"("appointmentId");

-- CreateIndex
CREATE INDEX "MedicalRecord_createdById_recordDate_idx" ON "public"."MedicalRecord"("createdById", "recordDate");

-- CreateIndex
CREATE INDEX "MedicalRecord_appointmentId_idx" ON "public"."MedicalRecord"("appointmentId");

-- CreateIndex
CREATE INDEX "MedicalRecordAccessLog_recordId_createdAt_idx" ON "public"."MedicalRecordAccessLog"("recordId", "createdAt");

-- CreateIndex
CREATE INDEX "MedicalRecordAccessLog_userId_createdAt_idx" ON "public"."MedicalRecordAccessLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."MedicalRecord" ADD CONSTRAINT "MedicalRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicalRecord" ADD CONSTRAINT "MedicalRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicalRecordAccessLog" ADD CONSTRAINT "MedicalRecordAccessLog_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "public"."MedicalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicalRecordAccessLog" ADD CONSTRAINT "MedicalRecordAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
