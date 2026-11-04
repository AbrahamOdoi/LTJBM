-- Phase F: children’s check-in + pickup tags; volunteer scheduling

CREATE TYPE "KidsCheckInStatus" AS ENUM ('CheckedIn', 'Released', 'Cancelled');
CREATE TYPE "VolunteerTeamKind" AS ENUM ('Usher', 'Worship', 'Hospitality', 'Kids', 'Media', 'Parking', 'Security', 'Other');
CREATE TYPE "VolunteerAssignmentStatus" AS ENUM ('SignedUp', 'Confirmed', 'Declined', 'Cancelled');

CREATE TABLE "KidsRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "branchId" TEXT,
    "ageMinYears" INTEGER,
    "ageMaxYears" INTEGER,
    "capacity" INTEGER,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KidsRoom_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KidsRoom_branchId_name_key" ON "KidsRoom"("branchId", "name");
CREATE INDEX "KidsRoom_isActive_idx" ON "KidsRoom"("isActive");

CREATE TABLE "ChildGuardian" (
    "id" TEXT NOT NULL,
    "childMemberId" TEXT NOT NULL,
    "guardianMemberId" TEXT NOT NULL,
    "relationship" TEXT,
    "canPickup" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChildGuardian_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChildGuardian_childMemberId_guardianMemberId_key" ON "ChildGuardian"("childMemberId", "guardianMemberId");
CREATE INDEX "ChildGuardian_guardianMemberId_idx" ON "ChildGuardian"("guardianMemberId");

CREATE TABLE "KidsCheckInSession" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "heldAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT NOT NULL,
    "roomId" TEXT,
    "attendanceSessionId" TEXT,
    "checkInToken" TEXT,
    "kioskEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KidsCheckInSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KidsCheckInSession_checkInToken_key" ON "KidsCheckInSession"("checkInToken");
CREATE INDEX "KidsCheckInSession_branchId_heldAt_idx" ON "KidsCheckInSession"("branchId", "heldAt");
CREATE INDEX "KidsCheckInSession_roomId_heldAt_idx" ON "KidsCheckInSession"("roomId", "heldAt");

CREATE TABLE "KidsCheckInRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "childMemberId" TEXT NOT NULL,
    "roomId" TEXT,
    "status" "KidsCheckInStatus" NOT NULL DEFAULT 'CheckedIn',
    "source" "AttendanceCheckInSource" NOT NULL DEFAULT 'Manual',
    "pickupCode" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInById" TEXT,
    "checkedInByGuardianId" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releasedById" TEXT,
    "releasedToGuardianId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KidsCheckInRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KidsCheckInRecord_sessionId_childMemberId_key" ON "KidsCheckInRecord"("sessionId", "childMemberId");
CREATE UNIQUE INDEX "KidsCheckInRecord_sessionId_pickupCode_key" ON "KidsCheckInRecord"("sessionId", "pickupCode");
CREATE INDEX "KidsCheckInRecord_status_sessionId_idx" ON "KidsCheckInRecord"("status", "sessionId");
CREATE INDEX "KidsCheckInRecord_childMemberId_idx" ON "KidsCheckInRecord"("childMemberId");
CREATE INDEX "KidsCheckInRecord_pickupCode_idx" ON "KidsCheckInRecord"("pickupCode");

CREATE TABLE "VolunteerTeam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "VolunteerTeamKind" NOT NULL,
    "description" TEXT,
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VolunteerTeam_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VolunteerTeam_branchId_name_key" ON "VolunteerTeam"("branchId", "name");
CREATE INDEX "VolunteerTeam_kind_isActive_idx" ON "VolunteerTeam"("kind", "isActive");

CREATE TABLE "VolunteerRole" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultSlots" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VolunteerRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VolunteerRole_teamId_name_key" ON "VolunteerRole"("teamId", "name");
CREATE INDEX "VolunteerRole_teamId_sortOrder_idx" ON "VolunteerRole"("teamId", "sortOrder");

CREATE TABLE "VolunteerService" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "branchId" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VolunteerService_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VolunteerService_startsAt_idx" ON "VolunteerService"("startsAt");
CREATE INDEX "VolunteerService_branchId_startsAt_idx" ON "VolunteerService"("branchId", "startsAt");

CREATE TABLE "VolunteerNeed" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "slotsNeeded" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VolunteerNeed_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VolunteerNeed_serviceId_roleId_key" ON "VolunteerNeed"("serviceId", "roleId");
CREATE INDEX "VolunteerNeed_roleId_idx" ON "VolunteerNeed"("roleId");

CREATE TABLE "VolunteerAssignment" (
    "id" TEXT NOT NULL,
    "needId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "VolunteerAssignmentStatus" NOT NULL DEFAULT 'SignedUp',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VolunteerAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VolunteerAssignment_needId_memberId_key" ON "VolunteerAssignment"("needId", "memberId");
CREATE INDEX "VolunteerAssignment_memberId_status_idx" ON "VolunteerAssignment"("memberId", "status");
CREATE INDEX "VolunteerAssignment_needId_status_idx" ON "VolunteerAssignment"("needId", "status");

ALTER TABLE "KidsRoom" ADD CONSTRAINT "KidsRoom_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChildGuardian" ADD CONSTRAINT "ChildGuardian_childMemberId_fkey" FOREIGN KEY ("childMemberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChildGuardian" ADD CONSTRAINT "ChildGuardian_guardianMemberId_fkey" FOREIGN KEY ("guardianMemberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KidsCheckInSession" ADD CONSTRAINT "KidsCheckInSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KidsCheckInSession" ADD CONSTRAINT "KidsCheckInSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "KidsRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KidsCheckInSession" ADD CONSTRAINT "KidsCheckInSession_attendanceSessionId_fkey" FOREIGN KEY ("attendanceSessionId") REFERENCES "AttendanceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "KidsCheckInRecord" ADD CONSTRAINT "KidsCheckInRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "KidsCheckInSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KidsCheckInRecord" ADD CONSTRAINT "KidsCheckInRecord_childMemberId_fkey" FOREIGN KEY ("childMemberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KidsCheckInRecord" ADD CONSTRAINT "KidsCheckInRecord_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "KidsRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KidsCheckInRecord" ADD CONSTRAINT "KidsCheckInRecord_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KidsCheckInRecord" ADD CONSTRAINT "KidsCheckInRecord_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KidsCheckInRecord" ADD CONSTRAINT "KidsCheckInRecord_releasedToGuardianId_fkey" FOREIGN KEY ("releasedToGuardianId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VolunteerTeam" ADD CONSTRAINT "VolunteerTeam_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VolunteerRole" ADD CONSTRAINT "VolunteerRole_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "VolunteerTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VolunteerService" ADD CONSTRAINT "VolunteerService_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VolunteerNeed" ADD CONSTRAINT "VolunteerNeed_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "VolunteerService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VolunteerNeed" ADD CONSTRAINT "VolunteerNeed_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "VolunteerRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VolunteerAssignment" ADD CONSTRAINT "VolunteerAssignment_needId_fkey" FOREIGN KEY ("needId") REFERENCES "VolunteerNeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VolunteerAssignment" ADD CONSTRAINT "VolunteerAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
