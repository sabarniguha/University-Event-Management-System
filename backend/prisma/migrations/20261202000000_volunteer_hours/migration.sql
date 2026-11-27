-- Confirmed volunteer (event staff) hours, entered by the organiser after the event. New table only.
CREATE TABLE "VolunteerHours" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "confirmedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VolunteerHours_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VolunteerHours_eventId_userId_key" ON "VolunteerHours"("eventId", "userId");
CREATE INDEX "VolunteerHours_userId_idx" ON "VolunteerHours"("userId");
ALTER TABLE "VolunteerHours" ADD CONSTRAINT "VolunteerHours_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VolunteerHours" ADD CONSTRAINT "VolunteerHours_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
