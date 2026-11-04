-- Phase E: QR/kiosk attendance, facilities, custom fields

CREATE TYPE "AttendanceCheckInSource" AS ENUM ('Manual', 'Kiosk', 'Mobile', 'Qr');
CREATE TYPE "CustomFieldType" AS ENUM ('Text', 'TextArea', 'Number', 'Date', 'Boolean', 'Select');

ALTER TABLE "AttendanceSession" ADD COLUMN "checkInToken" TEXT;
ALTER TABLE "AttendanceSession" ADD COLUMN "kioskEnabled" BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX "AttendanceSession_checkInToken_key" ON "AttendanceSession"("checkInToken");

ALTER TABLE "AttendanceRecord" ADD COLUMN "source" "AttendanceCheckInSource" NOT NULL DEFAULT 'Manual';
CREATE INDEX "AttendanceRecord_sessionId_present_idx" ON "AttendanceRecord"("sessionId", "present");

CREATE TABLE "FacilityRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "branchId" TEXT,
    "capacity" INTEGER,
    "location" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FacilityRoom_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FacilityRoom_branchId_name_key" ON "FacilityRoom"("branchId", "name");
CREATE INDEX "FacilityRoom_isActive_idx" ON "FacilityRoom"("isActive");

CREATE TABLE "RoomBooking" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "bookedBy" TEXT,
    "notes" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RoomBooking_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RoomBooking_roomId_startsAt_idx" ON "RoomBooking"("roomId", "startsAt");
CREATE INDEX "RoomBooking_startsAt_endsAt_idx" ON "RoomBooking"("startsAt", "endsAt");
CREATE INDEX "RoomBooking_eventId_idx" ON "RoomBooking"("eventId");

CREATE TABLE "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "CustomFieldType" NOT NULL DEFAULT 'Text',
    "optionsJson" JSONB,
    "helpText" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomFieldDefinition_key_key" ON "CustomFieldDefinition"("key");
CREATE INDEX "CustomFieldDefinition_isActive_sortOrder_idx" ON "CustomFieldDefinition"("isActive", "sortOrder");

CREATE TABLE "MemberCustomFieldValue" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "valueText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MemberCustomFieldValue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MemberCustomFieldValue_memberId_fieldId_key" ON "MemberCustomFieldValue"("memberId", "fieldId");
CREATE INDEX "MemberCustomFieldValue_fieldId_idx" ON "MemberCustomFieldValue"("fieldId");

ALTER TABLE "FacilityRoom" ADD CONSTRAINT "FacilityRoom_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "FacilityRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ChurchEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberCustomFieldValue" ADD CONSTRAINT "MemberCustomFieldValue_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberCustomFieldValue" ADD CONSTRAINT "MemberCustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
