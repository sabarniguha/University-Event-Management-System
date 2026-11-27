-- Public questions on an event page, answered by the organiser. New table only.
CREATE TABLE "EventQA" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "askerId" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredById" INTEGER,
    "answeredAt" TIMESTAMP(3),
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventQA_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EventQA_eventId_createdAt_idx" ON "EventQA"("eventId", "createdAt");
CREATE INDEX "EventQA_askerId_idx" ON "EventQA"("askerId");
ALTER TABLE "EventQA" ADD CONSTRAINT "EventQA_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventQA" ADD CONSTRAINT "EventQA_askerId_fkey" FOREIGN KEY ("askerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
