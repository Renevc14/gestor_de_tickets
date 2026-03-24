-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tickets_deleted_at_idx" ON "tickets"("deleted_at");
