import { randomBytes } from "node:crypto";
import type { AttendanceCheckInSource, AttendanceKind } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

export function newCheckInToken() {
  return randomBytes(18).toString("base64url");
}

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

export async function getAttendanceSessionByToken(token: string) {
  return prisma.attendanceSession.findUnique({
    where: { checkInToken: token },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      cell: { select: { id: true, name: true } },
      _count: { select: { records: true } },
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
      checkInToken: newCheckInToken(),
      kioskEnabled: true,
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

export async function ensureSessionCheckInToken(
  sessionId: string,
  actorId: string,
) {
  const existing = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    select: { id: true, checkInToken: true },
  });
  if (!existing) return null;
  if (existing.checkInToken) return existing.checkInToken;

  const token = newCheckInToken();
  await prisma.attendanceSession.update({
    where: { id: sessionId },
    data: { checkInToken: token, kioskEnabled: true },
  });
  await writeAuditLog({
    actorId,
    action: "attendance.token_issue",
    entityType: "AttendanceSession",
    entityId: sessionId,
  });
  return token;
}

export async function setSessionKioskEnabled(
  sessionId: string,
  enabled: boolean,
  actorId: string,
) {
  const session = await prisma.attendanceSession.update({
    where: { id: sessionId },
    data: { kioskEnabled: enabled },
  });
  await writeAuditLog({
    actorId,
    action: enabled ? "attendance.kiosk_enable" : "attendance.kiosk_disable",
    entityType: "AttendanceSession",
    entityId: sessionId,
  });
  return session;
}

export async function markAttendance(input: {
  sessionId: string;
  memberId: string;
  present?: boolean;
  notes?: string | null;
  actorId?: string | null;
  source?: AttendanceCheckInSource;
}) {
  const source = input.source ?? "Manual";
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
      markedById: input.actorId ?? null,
      source,
    },
    update: {
      present: input.present ?? true,
      notes: input.notes ?? null,
      markedById: input.actorId ?? null,
      source,
    },
  });
  return record;
}

/**
 * Public / kiosk check-in by member number (or exact name fallback) for a
 * session identified by check-in token.
 */
export async function checkInByToken(input: {
  token: string;
  memberNumber?: string | null;
  memberId?: string | null;
  source: AttendanceCheckInSource;
  actorId?: string | null;
}) {
  const session = await prisma.attendanceSession.findUnique({
    where: { checkInToken: input.token },
  });
  if (!session) {
    return { ok: false as const, error: "Check-in session not found." };
  }
  if (!session.kioskEnabled) {
    return { ok: false as const, error: "Check-in is closed for this session." };
  }

  let memberId = input.memberId ?? null;
  if (!memberId && input.memberNumber?.trim()) {
    const member = await prisma.member.findFirst({
      where: {
        memberNumber: { equals: input.memberNumber.trim(), mode: "insensitive" },
        branchId: session.branchId,
        status: { in: ["Active", "Visitor"] },
      },
      select: { id: true },
    });
    if (!member) {
      return {
        ok: false as const,
        error: "No matching member number for this branch.",
      };
    }
    memberId = member.id;
  }
  if (!memberId) {
    return { ok: false as const, error: "Member number is required." };
  }

  const record = await markAttendance({
    sessionId: session.id,
    memberId,
    present: true,
    actorId: input.actorId ?? null,
    source: input.source,
  });

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      memberNumber: true,
    },
  });

  return {
    ok: true as const,
    record,
    member,
    session: {
      id: session.id,
      label: session.label,
      heldAt: session.heldAt,
    },
  };
}

export async function searchMembersForAttendance(q: string, branchId?: string) {
  return prisma.member.findMany({
    where: {
      AND: [
        branchId ? { branchId } : {},
        { status: { in: ["Active", "Visitor"] } },
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

/** Headcount trend by session date (last N sessions, optional branch). */
export async function attendanceTrend(opts?: {
  branchId?: string | null;
  limit?: number;
}) {
  const limit = opts?.limit ?? 12;
  const sessions = await prisma.attendanceSession.findMany({
    where: opts?.branchId ? { branchId: opts.branchId } : undefined,
    orderBy: { heldAt: "asc" },
    take: limit,
    include: {
      branch: { select: { name: true, code: true } },
      _count: { select: { records: { where: { present: true } } } },
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    label: s.label,
    kind: s.kind,
    heldAt: s.heldAt.toISOString().slice(0, 10),
    branchName: s.branch.name,
    marked: s._count.records,
    headcount: s.headcount,
    effective: s.headcount ?? s._count.records,
  }));
}

/**
 * Simple absentee alert: Active members at branch who missed the last N
 * Service sessions (present=false or no record).
 */
export async function listAbsenteeAlerts(opts?: {
  branchId?: string | null;
  lookbackSessions?: number;
}) {
  const lookback = opts?.lookbackSessions ?? 3;
  const recentServices = await prisma.attendanceSession.findMany({
    where: {
      kind: "Service",
      ...(opts?.branchId ? { branchId: opts.branchId } : {}),
    },
    orderBy: { heldAt: "desc" },
    take: lookback,
    select: { id: true, label: true, heldAt: true, branchId: true },
  });

  if (recentServices.length === 0) {
    return { sessions: [] as typeof recentServices, absentees: [] as Array<{
      id: string;
      firstName: string;
      lastName: string;
      memberNumber: string | null;
      branchId: string;
      branchName: string;
      missed: number;
    }> };
  }

  const sessionIds = recentServices.map((s) => s.id);
  const branchIds = [...new Set(recentServices.map((s) => s.branchId))];

  const members = await prisma.member.findMany({
    where: {
      status: "Active",
      branchId: { in: branchIds },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      memberNumber: true,
      branchId: true,
      branch: { select: { name: true } },
    },
  });

  const present = await prisma.attendanceRecord.findMany({
    where: {
      sessionId: { in: sessionIds },
      present: true,
    },
    select: { sessionId: true, memberId: true },
  });

  const presentByMember = new Map<string, Set<string>>();
  for (const row of present) {
    const set = presentByMember.get(row.memberId) ?? new Set();
    set.add(row.sessionId);
    presentByMember.set(row.memberId, set);
  }

  const absentees = members
    .map((m) => {
      const attended = presentByMember.get(m.id)?.size ?? 0;
      const missed = sessionIds.length - attended;
      return {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        memberNumber: m.memberNumber,
        branchId: m.branchId,
        branchName: m.branch.name,
        missed,
      };
    })
    .filter((m) => m.missed >= Math.min(2, sessionIds.length))
    .sort((a, b) => b.missed - a.missed || a.lastName.localeCompare(b.lastName));

  return { sessions: recentServices, absentees };
}

/** Aggregate KPIs for reports dashboards (role-appropriate). */
export async function attendanceDashboardSlice(opts?: {
  branchIds?: string[] | null;
}) {
  const branchFilter =
    opts?.branchIds && opts.branchIds.length > 0
      ? { branchId: { in: opts.branchIds } }
      : {};

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [sessionCount, recentSessions, presentCount] = await Promise.all([
    prisma.attendanceSession.count({
      where: { ...branchFilter, heldAt: { gte: thirtyDaysAgo } },
    }),
    prisma.attendanceSession.findMany({
      where: branchFilter,
      orderBy: { heldAt: "desc" },
      take: 8,
      include: {
        branch: { select: { name: true } },
        _count: { select: { records: { where: { present: true } } } },
      },
    }),
    prisma.attendanceRecord.count({
      where: {
        present: true,
        session: { ...branchFilter, heldAt: { gte: thirtyDaysAgo } },
      },
    }),
  ]);

  const lastHead =
    recentSessions[0]?.headcount ?? recentSessions[0]?._count.records ?? 0;

  const trend = await attendanceTrend({
    branchId: opts?.branchIds?.[0] ?? null,
    limit: 8,
  });

  return {
    sessions30d: sessionCount,
    checkIns30d: presentCount,
    lastSessionCount: lastHead,
    trend,
    recent: recentSessions.map((s) => ({
      id: s.id,
      label: s.label,
      heldAt: s.heldAt.toISOString(),
      branchName: s.branch.name,
      marked: s._count.records,
      headcount: s.headcount,
    })),
  };
}
