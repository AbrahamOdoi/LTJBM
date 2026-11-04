import type { AttendanceKind } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

export async function listAttendanceSessions(limit = 40) {
  return prisma.attendanceSession.findMany({
    orderBy: { heldAt: "desc" },
    take: limit,
    include: {
      branch: { select: { id: true, name: true, code: true } },
      cell: { select: { id: true, name: true } },
      _count: { select: { records: true } },
    },
  });
}

export async function getAttendanceSession(id: string) {
  return prisma.attendanceSession.findUnique({
    where: { id },
    include: {
      branch: true,
      cell: true,
      records: {
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              memberNumber: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createAttendanceSession(input: {
  kind: AttendanceKind;
  label: string;
  heldAt: Date;
  branchId: string;
  cellId?: string | null;
  headcount?: number | null;
  notes?: string | null;
  actorId: string;
}) {
  const session = await prisma.attendanceSession.create({
    data: {
      kind: input.kind,
      label: input.label,
      heldAt: input.heldAt,
      branchId: input.branchId,
      cellId: input.cellId ?? null,
      headcount: input.headcount ?? null,
      notes: input.notes ?? null,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "attendance.session_create",
    entityType: "AttendanceSession",
    entityId: session.id,
    metadata: { kind: input.kind, branchId: input.branchId },
  });
  return session;
}

export async function markAttendance(input: {
  sessionId: string;
  memberId: string;
  present?: boolean;
  notes?: string | null;
  actorId: string;
}) {
  const record = await prisma.attendanceRecord.upsert({
    where: {
      sessionId_memberId: {
        sessionId: input.sessionId,
        memberId: input.memberId,
      },
    },
    create: {
      sessionId: input.sessionId,
      memberId: input.memberId,
      present: input.present ?? true,
      notes: input.notes ?? null,
      markedById: input.actorId,
    },
    update: {
      present: input.present ?? true,
      notes: input.notes ?? null,
      markedById: input.actorId,
    },
  });
  return record;
}

export async function searchMembersForAttendance(q: string, branchId?: string) {
  return prisma.member.findMany({
    where: {
      AND: [
        branchId ? { branchId } : {},
        {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { memberNumber: { contains: q, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      memberNumber: true,
    },
    take: 20,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}
