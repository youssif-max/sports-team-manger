-- CreateEnum
CREATE TYPE "TeamType" AS ENUM ('CLUB', 'SCHOOL', 'RECREATIONAL', 'TRAVEL', 'OTHER');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "teamType" "TeamType" NOT NULL DEFAULT 'OTHER';
