-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "recurringGroupId" TEXT;

-- AlterTable
ALTER TABLE "GameResult" ALTER COLUMN "teamScore" DROP NOT NULL,
ALTER COLUMN "opponentScore" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Play" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "diagram" TEXT,
    "fileUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Play_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_recurringGroupId_idx" ON "Event"("recurringGroupId");

-- AddForeignKey
ALTER TABLE "Play" ADD CONSTRAINT "Play_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Play" ADD CONSTRAINT "Play_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
