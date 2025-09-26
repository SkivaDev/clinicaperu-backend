/*
  Warnings:

  - Changed the type of `cmp` on the `Doctor` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Doctor" ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
DROP COLUMN "cmp",
ADD COLUMN     "cmp" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_cmp_key" ON "public"."Doctor"("cmp");

-- CreateIndex
CREATE INDEX "Doctor_cmp_idx" ON "public"."Doctor"("cmp");
