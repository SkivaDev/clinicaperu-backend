/*
  Warnings:

  - Added the required column `updatedAt` to the `Clinic` table without a default value. This is not possible if the table is not empty.
  - Made the column `ubigeoDept` on table `Clinic` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ubigeoProv` on table `Clinic` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ubigeoDist` on table `Clinic` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Clinic" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "ubigeoDept" SET NOT NULL,
ALTER COLUMN "ubigeoProv" SET NOT NULL,
ALTER COLUMN "ubigeoDist" SET NOT NULL;
