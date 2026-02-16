/*
  Warnings:

  - Changed the type of `createdAt` on the `ChatSession` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `updatedAt` on the `ChatSession` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `createdAt` on the `Messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ChatSession" DROP COLUMN "createdAt",
ADD COLUMN     "createdAt" INTEGER NOT NULL,
DROP COLUMN "updatedAt",
ADD COLUMN     "updatedAt" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Messages" DROP COLUMN "createdAt",
ADD COLUMN     "createdAt" INTEGER NOT NULL;
