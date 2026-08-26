-- AlterTable
ALTER TABLE "support_messages" ADD COLUMN     "autorIsIA" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "autorUserId" DROP NOT NULL;
