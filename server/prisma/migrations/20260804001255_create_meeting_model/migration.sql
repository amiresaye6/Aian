/*
  Warnings:

  - You are about to drop the column `createdAt` on the `MeetingRegistrant` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `MeetingRegistrant` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "MeetingRegistrant_connectionId_idx";

-- DropIndex
DROP INDEX "MeetingRegistrant_meetingId_idx";

-- AlterTable
ALTER TABLE "MeetingRegistrant" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "joinUrl" TEXT NOT NULL,
    "startUrl" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MeetingRegistrant" ADD CONSTRAINT "MeetingRegistrant_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
