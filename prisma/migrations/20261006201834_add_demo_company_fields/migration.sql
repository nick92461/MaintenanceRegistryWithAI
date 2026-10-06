-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Company_isDemo_expiresAt_idx" ON "Company"("isDemo", "expiresAt");
