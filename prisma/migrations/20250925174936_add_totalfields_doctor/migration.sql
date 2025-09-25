-- AlterTable
ALTER TABLE "public"."Doctor" ADD COLUMN     "attendedAppointments" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "attendedPatients" INTEGER NOT NULL DEFAULT 0;
