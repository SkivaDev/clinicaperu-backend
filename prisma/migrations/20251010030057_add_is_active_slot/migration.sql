-- AlterTable
ALTER TABLE "public"."Slot" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "User_lastName_idx" ON "public"."User"("lastName");

-- CreateIndex
CREATE INDEX "User_firstName_lastName_idx" ON "public"."User"("firstName", "lastName");
