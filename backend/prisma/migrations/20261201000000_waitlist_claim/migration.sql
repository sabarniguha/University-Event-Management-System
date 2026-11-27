-- Optional claim window for waitlist promotions. NULL (default for every existing event) keeps today's behaviour:
-- a student moved off the waitlist simply keeps the seat.
ALTER TABLE "Event" ADD COLUMN "waitlistClaimHours" INTEGER;

CREATE TABLE "WaitlistClaim" (
    "id" SERIAL NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaitlistClaim_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WaitlistClaim_registrationId_key" ON "WaitlistClaim"("registrationId");
CREATE INDEX "WaitlistClaim_deadline_idx" ON "WaitlistClaim"("deadline");
ALTER TABLE "WaitlistClaim" ADD CONSTRAINT "WaitlistClaim_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
