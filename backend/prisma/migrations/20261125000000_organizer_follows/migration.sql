-- Students can follow organisers to hear about their new events. New table only; nothing existing changes.
CREATE TABLE "OrganizerFollow" (
    "id" SERIAL NOT NULL,
    "followerId" INTEGER NOT NULL,
    "organizerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizerFollow_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizerFollow_followerId_organizerId_key" ON "OrganizerFollow"("followerId", "organizerId");
CREATE INDEX "OrganizerFollow_organizerId_idx" ON "OrganizerFollow"("organizerId");
ALTER TABLE "OrganizerFollow" ADD CONSTRAINT "OrganizerFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizerFollow" ADD CONSTRAINT "OrganizerFollow_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
