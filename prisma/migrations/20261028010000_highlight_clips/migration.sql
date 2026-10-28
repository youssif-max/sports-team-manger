-- AlterTable
ALTER TABLE "Highlight" ADD COLUMN     "postedById" TEXT,
ADD COLUMN     "startSeconds" INTEGER,
ADD COLUMN     "endSeconds" INTEGER;

-- CreateIndex
CREATE INDEX "Highlight_postedById_idx" ON "Highlight"("postedById");

-- AddForeignKey
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
