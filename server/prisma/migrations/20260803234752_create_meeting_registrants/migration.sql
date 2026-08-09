-- CreateTable
CREATE TABLE "MeetingRegistrant" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingRegistrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingRegistrant_meetingId_idx" ON "MeetingRegistrant"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingRegistrant_connectionId_idx" ON "MeetingRegistrant"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingRegistrant_meetingId_email_key" ON "MeetingRegistrant"("meetingId", "email");
