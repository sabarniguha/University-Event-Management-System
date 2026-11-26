-- Optional refund rule per event: students who cancel at least this many hours before the start get an automatic refund.
-- NULL (the default for every existing event) keeps today's behaviour: no automatic refund.
ALTER TABLE "Event" ADD COLUMN "refundCutoffHours" INTEGER;
