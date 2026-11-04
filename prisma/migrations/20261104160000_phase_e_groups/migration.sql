-- Phase E Later: groups & ministries hub (leaders, rosters, meetings, announcements)

CREATE TYPE "MinistryGroupKind" AS ENUM ('Cell', 'Fellowship', 'Choir', 'Usher', 'Youth', 'Department', 'Other');

ALTER TYPE "MessageTemplateKind" ADD VALUE 'GroupAnnounce';

CREATE TABLE "MinistryGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "MinistryGroupKind" NOT NULL,
    "description" TEXT,
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cellId" TEXT,
    "fellowshipMinistryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MinistryGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MinistryGroup_cellId_key" ON "MinistryGroup"("cellId");
CREATE UNIQUE INDEX "MinistryGroup_fellowshipMinistryId_key" ON "MinistryGroup"("fellowshipMinistryId");
CREATE INDEX "MinistryGroup_kind_isActive_idx" ON "MinistryGroup"("kind", "isActive");
CREATE INDEX "MinistryGroup_branchId_kind_idx" ON "MinistryGroup"("branchId", "kind");

CREATE TABLE "GroupLeader" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "title" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GroupLeader_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GroupLeader_groupId_endedAt_idx" ON "GroupLeader"("groupId", "endedAt");
CREATE INDEX "GroupLeader_memberId_idx" ON "GroupLeader"("memberId");

CREATE TABLE "GroupRosterEntry" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleNote" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GroupRosterEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GroupRosterEntry_groupId_endedAt_idx" ON "GroupRosterEntry"("groupId", "endedAt");
CREATE INDEX "GroupRosterEntry_memberId_idx" ON "GroupRosterEntry"("memberId");

CREATE TABLE "GroupMeetingLog" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "heldAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "attendanceCount" INTEGER,
    "location" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GroupMeetingLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GroupMeetingLog_groupId_heldAt_idx" ON "GroupMeetingLog"("groupId", "heldAt");

CREATE TABLE "GroupAnnouncement" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "CommChannelKind" NOT NULL DEFAULT 'Email',
    "outboxLogged" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GroupAnnouncement_groupId_createdAt_idx" ON "GroupAnnouncement"("groupId", "createdAt");

ALTER TABLE "MinistryGroup" ADD CONSTRAINT "MinistryGroup_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MinistryGroup" ADD CONSTRAINT "MinistryGroup_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MinistryGroup" ADD CONSTRAINT "MinistryGroup_fellowshipMinistryId_fkey" FOREIGN KEY ("fellowshipMinistryId") REFERENCES "FellowshipMinistry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GroupLeader" ADD CONSTRAINT "GroupLeader_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MinistryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupLeader" ADD CONSTRAINT "GroupLeader_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupRosterEntry" ADD CONSTRAINT "GroupRosterEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MinistryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupRosterEntry" ADD CONSTRAINT "GroupRosterEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupMeetingLog" ADD CONSTRAINT "GroupMeetingLog_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MinistryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMeetingLog" ADD CONSTRAINT "GroupMeetingLog_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GroupAnnouncement" ADD CONSTRAINT "GroupAnnouncement_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MinistryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupAnnouncement" ADD CONSTRAINT "GroupAnnouncement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
