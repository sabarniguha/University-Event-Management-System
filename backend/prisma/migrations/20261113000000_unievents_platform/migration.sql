-- UniEvents platform upgrade. Purely additive: no existing table or column is dropped or retyped.
-- Adds approvals, categories, certificates, audit logs, settings, organiser requests, auth tokens,
-- media storage, newsletter/contact, and extra user/event profile fields.

-- AlterEnum
ALTER TYPE "EventStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "EventStatus" ADD VALUE 'REJECTED';
ALTER TYPE "RegistrationStatus" ADD VALUE 'PENDING';
ALTER TYPE "RegistrationStatus" ADD VALUE 'REJECTED';

-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('OFFLINE', 'ONLINE', 'HYBRID');
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "AuthTokenType" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- AlterTable: User
ALTER TABLE "User"
    ADD COLUMN "studentId" TEXT,
    ADD COLUMN "year" INTEGER,
    ADD COLUMN "college" TEXT,
    ADD COLUMN "avatarUrl" TEXT,
    ADD COLUMN "bio" TEXT,
    ADD COLUMN "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
    ADD COLUMN "lastLoginAt" TIMESTAMP(3),
    ADD COLUMN "notificationPrefs" JSONB;

-- AlterTable: Event
ALTER TABLE "Event"
    ADD COLUMN "mode" "EventMode" NOT NULL DEFAULT 'OFFLINE',
    ADD COLUMN "onlineUrl" TEXT,
    ADD COLUMN "fee" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "eventType" TEXT,
    ADD COLUMN "department" TEXT,
    ADD COLUMN "eligibility" TEXT,
    ADD COLUMN "requirements" TEXT,
    ADD COLUMN "agenda" JSONB,
    ADD COLUMN "speakers" JSONB,
    ADD COLUMN "team" JSONB,
    ADD COLUMN "faqs" JSONB,
    ADD COLUMN "contactEmail" TEXT,
    ADD COLUMN "contactPhone" TEXT,
    ADD COLUMN "terms" TEXT,
    ADD COLUMN "requiresRegistrationApproval" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "rejectionReason" TEXT,
    ADD COLUMN "submittedAt" TIMESTAMP(3),
    ADD COLUMN "reviewedById" INTEGER,
    ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- AlterTable: Registration
ALTER TABLE "Registration" ADD COLUMN "decisionNote" TEXT;

-- AlterTable: Notification
ALTER TABLE "Notification"
    ADD COLUMN "type" TEXT NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN "refKey" TEXT;

-- Align existing events with the managed category names.
UPDATE "Event" SET "category" = 'Workshops' WHERE "category" = 'Workshop';
UPDATE "Event" SET "category" = 'Social and Community' WHERE "category" = 'Social';

-- CreateTable
CREATE TABLE "EventCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizerProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "organization" TEXT NOT NULL,
    "designation" TEXT,
    "reason" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" SERIAL NOT NULL,
    "certificateId" TEXT NOT NULL,
    "eventId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "issuedById" INTEGER,
    "templateKey" TEXT NOT NULL DEFAULT 'classic',
    "title" TEXT NOT NULL DEFAULT 'Certificate of Participation',
    "signatoryName" TEXT,
    "signatoryTitle" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");
CREATE INDEX "Event_category_idx" ON "Event"("category");
CREATE UNIQUE INDEX "Notification_userId_refKey_key" ON "Notification"("userId", "refKey");
CREATE UNIQUE INDEX "EventCategory_name_key" ON "EventCategory"("name");
CREATE UNIQUE INDEX "EventCategory_slug_key" ON "EventCategory"("slug");
CREATE UNIQUE INDEX "OrganizerProfile_userId_key" ON "OrganizerProfile"("userId");
CREATE INDEX "OrganizerProfile_status_idx" ON "OrganizerProfile"("status");
CREATE UNIQUE INDEX "Certificate_certificateId_key" ON "Certificate"("certificateId");
CREATE UNIQUE INDEX "Certificate_registrationId_key" ON "Certificate"("registrationId");
CREATE INDEX "Certificate_eventId_idx" ON "Certificate"("eventId");
CREATE INDEX "Certificate_userId_idx" ON "Certificate"("userId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");
CREATE INDEX "AuthToken_userId_type_idx" ON "AuthToken"("userId", "type");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizerProfile" ADD CONSTRAINT "OrganizerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizerProfile" ADD CONSTRAINT "OrganizerProfile_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
