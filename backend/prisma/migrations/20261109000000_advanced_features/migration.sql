-- Advanced features: waitlist, QR tickets, check-in method, feedback, notifications.
-- Purely additive: no existing column or table is dropped or changed in type, and
-- existing registrations are backfilled so the new NOT NULL column is safe on live data.

-- AlterEnum (waitlist support)
ALTER TYPE "RegistrationStatus" ADD VALUE 'WAITLISTED';

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('MANUAL', 'QR');

-- AlterTable: Event
ALTER TABLE "Event"
    ADD COLUMN "registrationDeadline" TIMESTAMP(3),
    ADD COLUMN "waitlistEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Registration (add nullable first, backfill, then enforce)
ALTER TABLE "Registration"
    ADD COLUMN "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "ticketCode" TEXT;

UPDATE "Registration"
SET "joinedAt" = "createdAt",
    "ticketCode" = md5(random()::text || "id"::text || clock_timestamp()::text);

ALTER TABLE "Registration" ALTER COLUMN "ticketCode" SET NOT NULL;

-- AlterTable: Attendance
ALTER TABLE "Attendance" ADD COLUMN "method" "AttendanceMethod" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "Feedback" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Registration_ticketCode_key" ON "Registration"("ticketCode");

-- CreateIndex
CREATE INDEX "Registration_eventId_status_idx" ON "Registration"("eventId", "status");

-- CreateIndex
CREATE INDEX "Feedback_eventId_idx" ON "Feedback"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_eventId_userId_key" ON "Feedback"("eventId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
