-- Optional two-factor sign-in and login lockout. Purely additive; every existing account is unchanged
-- (no 2FA, zero failed attempts, not locked).
ALTER TABLE "User" ADD COLUMN "twoFactorSecretEnc" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorEnabledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "twoFactorBackup" JSONB;
ALTER TABLE "User" ADD COLUMN "twoFactorLastStep" INTEGER;
ALTER TABLE "User" ADD COLUMN "failedLogins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);
