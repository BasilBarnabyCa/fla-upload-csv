-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPERADMIN';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "protected" BOOLEAN NOT NULL DEFAULT false;
