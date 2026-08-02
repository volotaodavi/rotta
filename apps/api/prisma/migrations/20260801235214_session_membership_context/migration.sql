/*
  Warnings:

  - Added the required column `role` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vinculoId` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "role" TEXT NOT NULL,
ADD COLUMN     "tenantId" UUID,
ADD COLUMN     "vinculoId" TEXT NOT NULL;
