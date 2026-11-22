-- Optional name written on the certificate and a performance remark. Both stay empty for existing certificates,
-- which keep using the student's account name and show no remark.
ALTER TABLE "Certificate" ADD COLUMN "recipientName" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "remarks" TEXT;
