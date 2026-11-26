-- Early-bird price on events and promo codes per event. New columns are optional and new table only; nothing existing changes.
ALTER TABLE "Event" ADD COLUMN "earlyBirdFee" INTEGER;
ALTER TABLE "Event" ADD COLUMN "earlyBirdUntil" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "discountCodeId" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "listAmount" INTEGER;

CREATE TABLE "DiscountCode" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PERCENT',
    "value" INTEGER NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiscountCode_eventId_code_key" ON "DiscountCode"("eventId", "code");
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
