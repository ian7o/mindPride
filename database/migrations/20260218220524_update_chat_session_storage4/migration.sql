/*
  Warnings:

  - Added the required column `updatedAt` to the `Messages` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `role` on the `Messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('system', 'user', 'assistant', 'tool', 'function');

-- DropForeignKey
ALTER TABLE "Messages" DROP CONSTRAINT "Messages_chatSessionID_fkey";

-- DropIndex
DROP INDEX "Messages_chatSessionID_key";

-- AlterTable
ALTER TABLE "Messages" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "MessageRole" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_chatSessionID_fkey" FOREIGN KEY ("chatSessionID") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
