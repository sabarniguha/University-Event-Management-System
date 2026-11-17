-- Event gallery photos and sponsor logos. Purely additive.
CREATE TABLE "EventAsset" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PHOTO',
    "url" TEXT NOT NULL,
    "title" TEXT,
    "link" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventAsset_eventId_kind_idx" ON "EventAsset"("eventId", "kind");

ALTER TABLE "EventAsset" ADD CONSTRAINT "EventAsset_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
