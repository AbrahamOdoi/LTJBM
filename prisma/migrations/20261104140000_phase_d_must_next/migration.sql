-- Phase D Must-next: membership enrichments, attendance, pastoral, events, comms, portal

-- AlterEnum Role
ALTER TYPE "Role" ADD VALUE 'Member';

-- AlterEnum MemberStatus
ALTER TYPE "MemberStatus" ADD VALUE 'Visitor';

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "memberId" TEXT;
CREATE UNIQUE INDEX "User_memberId_key" ON "User"("memberId");

-- AlterTable Member
ALTER TABLE "Member" ADD COLUMN "joinedAt" TIMESTAMP(3);
ALTER TABLE "Member" ADD COLUMN "baptismDate" TIMESTAMP(3);
ALTER TABLE "Member" ADD COLUMN "confirmationDate" TIMESTAMP(3);
CREATE INDEX "Member_status_idx" ON "Member"("status");
CREATE INDEX "Member_joinedAt_idx" ON "Member"("joinedAt");

-- CreateEnum
CREATE TYPE "MilestoneKind" AS ENUM ('Birthday', 'WeddingAnniversary', 'Baptism', 'Confirmation', 'Dedication', 'Other');
CREATE TYPE "FollowUpStatus" AS ENUM ('Open', 'InProgress', 'Completed', 'Cancelled');
CREATE TYPE "AttendanceKind" AS ENUM ('Service', 'Cell');
CREATE TYPE "PastoralNoteKind" AS ENUM ('Prayer', 'Visitation', 'Counselling', 'Wedding', 'Funeral', 'Dedication', 'Other');
CREATE TYPE "CommChannelKind" AS ENUM ('Email', 'Sms', 'WhatsApp', 'Push');
CREATE TYPE "MessageTemplateKind" AS ENUM ('Birthday', 'Welcome', 'Receipt', 'BoardReport', 'Custom');

-- Tags
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

CREATE TABLE "MemberTag" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberTag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MemberTag_memberId_tagId_key" ON "MemberTag"("memberId", "tagId");
CREATE INDEX "MemberTag_tagId_idx" ON "MemberTag"("tagId");

CREATE TABLE "MemberMilestone" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "kind" "MilestoneKind" NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MemberMilestone_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MemberMilestone_memberId_occurredOn_idx" ON "MemberMilestone"("memberId", "occurredOn");
CREATE INDEX "MemberMilestone_kind_occurredOn_idx" ON "MemberMilestone"("kind", "occurredOn");

CREATE TABLE "VisitorFollowUp" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'Open',
    "firstVisitOn" TIMESTAMP(3),
    "notes" TEXT,
    "nextActionOn" TIMESTAMP(3),
    "assignedToId" TEXT,
    "createdById" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VisitorFollowUp_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VisitorFollowUp_status_nextActionOn_idx" ON "VisitorFollowUp"("status", "nextActionOn");
CREATE INDEX "VisitorFollowUp_memberId_idx" ON "VisitorFollowUp"("memberId");

CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "kind" "AttendanceKind" NOT NULL,
    "label" TEXT NOT NULL,
    "heldAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT NOT NULL,
    "cellId" TEXT,
    "headcount" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AttendanceSession_branchId_heldAt_idx" ON "AttendanceSession"("branchId", "heldAt");
CREATE INDEX "AttendanceSession_cellId_heldAt_idx" ON "AttendanceSession"("cellId", "heldAt");

CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "markedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AttendanceRecord_sessionId_memberId_key" ON "AttendanceRecord"("sessionId", "memberId");
CREATE INDEX "AttendanceRecord_memberId_idx" ON "AttendanceRecord"("memberId");

CREATE TABLE "PastoralCareNote" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "kind" "PastoralNoteKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PastoralCareNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PastoralCareNote_kind_occurredOn_idx" ON "PastoralCareNote"("kind", "occurredOn");
CREATE INDEX "PastoralCareNote_memberId_idx" ON "PastoralCareNote"("memberId");

CREATE TABLE "ChurchEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "branchId" TEXT,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChurchEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChurchEvent_startsAt_idx" ON "ChurchEvent"("startsAt");
CREATE INDEX "ChurchEvent_branchId_idx" ON "ChurchEvent"("branchId");

CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "memberId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EventRegistration_eventId_idx" ON "EventRegistration"("eventId");

CREATE TABLE "CommunicationChannel" (
    "id" TEXT NOT NULL,
    "kind" "CommChannelKind" NOT NULL,
    "label" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "configJson" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunicationChannel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommunicationChannel_kind_key" ON "CommunicationChannel"("kind");

CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "kind" "MessageTemplateKind" NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "channel" "CommChannelKind" NOT NULL DEFAULT 'Email',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MessageTemplate_kind_idx" ON "MessageTemplate"("kind");

CREATE TABLE "MessageOutbox" (
    "id" TEXT NOT NULL,
    "channel" "CommChannelKind" NOT NULL,
    "templateKind" "MessageTemplateKind",
    "toAddress" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'stubbed',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageOutbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MessageOutbox_createdAt_idx" ON "MessageOutbox"("createdAt");
CREATE INDEX "MessageOutbox_status_idx" ON "MessageOutbox"("status");

-- Foreign keys
ALTER TABLE "User" ADD CONSTRAINT "User_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MemberTag" ADD CONSTRAINT "MemberTag_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberTag" ADD CONSTRAINT "MemberTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MemberMilestone" ADD CONSTRAINT "MemberMilestone_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VisitorFollowUp" ADD CONSTRAINT "VisitorFollowUp_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitorFollowUp" ADD CONSTRAINT "VisitorFollowUp_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VisitorFollowUp" ADD CONSTRAINT "VisitorFollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PastoralCareNote" ADD CONSTRAINT "PastoralCareNote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PastoralCareNote" ADD CONSTRAINT "PastoralCareNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChurchEvent" ADD CONSTRAINT "ChurchEvent_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ChurchEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
