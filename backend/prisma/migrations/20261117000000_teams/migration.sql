-- Team registration for events. Purely additive: every existing event stays a solo event (teamMin = teamMax = 1).
ALTER TABLE "Event" ADD COLUMN "teamMin" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Event" ADD COLUMN "teamMax" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "EventTeam" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" INTEGER NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventTeamMember" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventTeam_inviteCode_key" ON "EventTeam"("inviteCode");
CREATE UNIQUE INDEX "EventTeam_eventId_name_key" ON "EventTeam"("eventId", "name");
CREATE INDEX "EventTeam_eventId_idx" ON "EventTeam"("eventId");
CREATE UNIQUE INDEX "EventTeamMember_eventId_userId_key" ON "EventTeamMember"("eventId", "userId");
CREATE INDEX "EventTeamMember_teamId_idx" ON "EventTeamMember"("teamId");

ALTER TABLE "EventTeam" ADD CONSTRAINT "EventTeam_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventTeam" ADD CONSTRAINT "EventTeam_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventTeamMember" ADD CONSTRAINT "EventTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "EventTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventTeamMember" ADD CONSTRAINT "EventTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
