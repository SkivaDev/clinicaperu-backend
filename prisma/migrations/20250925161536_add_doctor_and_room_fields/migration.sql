/*
  Warnings:

  - Added the required column `updatedAt` to the `Doctor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `capacity` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomNumber` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomType` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `floor` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."RoomType" AS ENUM ('CONSULTATION', 'SURGERY', 'EMERGENCY', 'ICU', 'LABORATORY', 'RADIOLOGY');

-- AlterTable
ALTER TABLE "public"."Doctor" ADD COLUMN     "consultationPrice" DOUBLE PRECISION,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "yearsOfExperience" INTEGER;

-- AlterTable
ALTER TABLE "public"."Room" ADD COLUMN     "capacity" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "equipment" TEXT[],
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "roomNumber" TEXT NOT NULL,
ADD COLUMN     "roomType" "public"."RoomType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "floor",
ADD COLUMN     "floor" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Room_roomType_idx" ON "public"."Room"("roomType");
