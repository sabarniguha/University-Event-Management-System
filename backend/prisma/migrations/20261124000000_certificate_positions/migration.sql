-- Optional result on a certificate: WINNER, FIRST_RUNNER_UP or SECOND_RUNNER_UP. Empty for every existing certificate.
ALTER TABLE "Certificate" ADD COLUMN "position" TEXT;
