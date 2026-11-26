-- CreateEnum
CREATE TYPE "HighlightVisibility" AS ENUM ('TEAM', 'PUBLIC');

-- AlterTable
ALTER TABLE "Highlight" ADD COLUMN     "visibility" "HighlightVisibility" NOT NULL DEFAULT 'TEAM',
ADD COLUMN     "uploaded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hiddenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Highlight_visibility_hiddenAt_createdAt_idx" ON "Highlight"("visibility", "hiddenAt", "createdAt");
