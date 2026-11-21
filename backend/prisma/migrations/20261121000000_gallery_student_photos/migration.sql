-- Student-uploaded event photos need approval before they are public. Purely additive:
-- existing rows keep approved = true, so nothing already published changes.
ALTER TABLE "EventAsset" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "EventAsset" ADD COLUMN "uploaderRole" TEXT;
