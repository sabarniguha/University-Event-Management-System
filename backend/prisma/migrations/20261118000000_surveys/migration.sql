-- Event surveys. Purely additive: two new tables.
CREATE TABLE "EventQuestion" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'REGISTRATION',
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventAnswer" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventQuestion_eventId_kind_idx" ON "EventQuestion"("eventId", "kind");
CREATE UNIQUE INDEX "EventAnswer_questionId_userId_key" ON "EventAnswer"("questionId", "userId");
CREATE INDEX "EventAnswer_userId_idx" ON "EventAnswer"("userId");

ALTER TABLE "EventQuestion" ADD CONSTRAINT "EventQuestion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventAnswer" ADD CONSTRAINT "EventAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EventQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventAnswer" ADD CONSTRAINT "EventAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
