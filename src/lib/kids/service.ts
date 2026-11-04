import { randomBytes, randomInt } from "node:crypto";
import type { AttendanceCheckInSource } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { newCheckInToken } from "@/lib/attendance/service";

const PICKUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newPickupCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += PICKUP_ALPHABET[randomInt(PICKUP_ALPHABET.length)]!;
  }
  return code;
}

export async function listKidsRooms(branchId?: string | null) {
  return prisma.kidsRoom.findMany({
    where: {
      isActive: true,
      ...(branchId ? { branchId } : {}),
    },
    orderBy: [{ name: "asc" }],
  });
}

export async function listKidsSessions(limit = 40) {
  return prisma.kidsCheckInSession.findMany({
    orderBy: { heldAt: "desc" },
    take: limit,
    include: {
      branch: { select: { id: true, name: true, code: true } },
      room: { select: { id: true, name: true } },
      _count: {
        select: {
          checkIns: { where: { status: "CheckedIn" } },
        },
      },
    },
  });
}

export async function getKidsSession(id: string) {
  return prisma.kidsCheckInSession.findUnique({
    where: { id },
    include: {
      branch: true,
      room: true,
      attendanceSession: { select: { id: true, label: true } },
      checkIns: {
        include: {
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              memberNumber: true,
              dateOfBirth: true,
            },
          },
          room: { select: { id: true, name: true } },
          releasedToGuardian: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: [{ status: "asc" }, { checkedInAt: "asc" }],
      },
    },
  });
}

export async function getKidsSessionByToken(token: string) {
  return prisma.kidsCheckInSession.findUnique({
    where: { checkInToken: token },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      room: { select: { id: true, name: true } },
      _count: { select: { checkIns: { where: { status: "CheckedIn" } } } },
    },
  });
}

export async function createKidsSession(input: {
  label: string;
  heldAt: Date;
  branchId: string;
  roomId?: string | null;
  attendanceSessionId?: string | null;
  notes?: string | null;
  actorId: string;
}) {
  const session = await prisma.kidsCheckInSession.create({
    data: {
      label: input.label,
      heldAt: input.heldAt,
      branchId: input.branchId,
      roomId: input.roomId ?? null,
      attendanceSessionId: input.attendanceSessionId ?? null,
      notes: input.notes ?? null,
      checkInToken: newCheckInToken(),
      kioskEnabled: true,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "kids.session_create",
    entityType: "KidsCheckInSession",
    entityId: session.id,
    metadata: { branchId: input.branchId },
  });
  return session;
}

export async function createKidsRoom(input: {
  name: string;
  branchId?: string | null;
  code?: string | null;
  ageMinYears?: number | null;
  ageMaxYears?: number | null;
  capacity?: number | null;
  notes?: string | null;
  actorId: string;
}) {
  const room = await prisma.kidsRoom.create({
    data: {
      name: input.name,
      branchId: input.branchId ?? null,
      code: input.code ?? null,
      ageMinYears: input.ageMinYears ?? null,
      ageMaxYears: input.ageMaxYears ?? null,
      capacity: input.capacity ?? null,
      notes: input.notes ?? null,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "kids.room_create",
    entityType: "KidsRoom",
    entityId: room.id,
  });
  return room;
}

export async function linkChildGuardian(input: {
  childMemberId: string;
  guardianMemberId: string;
  relationship?: string | null;
  canPickup?: boolean;
  actorId: string;
}) {
  const row = await prisma.childGuardian.upsert({
    where: {
      childMemberId_guardianMemberId: {
        childMemberId: input.childMemberId,
        guardianMemberId: input.guardianMemberId,
      },
    },
    create: {
      childMemberId: input.childMemberId,
      guardianMemberId: input.guardianMemberId,
      relationship: input.relationship ?? null,
      canPickup: input.canPickup ?? true,
    },
    update: {
      relationship: input.relationship ?? null,
      canPickup: input.canPickup ?? true,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "kids.guardian_link",
    entityType: "ChildGuardian",
    entityId: row.id,
  });
  return row;
}

/**
 * Guardians for a child: explicit ChildGuardian rows + household Head/Spouse
 * when the child is HouseholdRelation.Child / Dependent.
 */
export async function resolveGuardiansForChild(childMemberId: string) {
  const explicit = await prisma.childGuardian.findMany({
    where: { childMemberId, canPickup: true },
    include: {
      guardian: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          memberNumber: true,
          phone: true,
        },
      },
    },
  });

  const householdLinks = await prisma.householdMember.findMany({
    where: {
      memberId: childMemberId,
      relation: { in: ["Child", "Dependent"] },
    },
    select: { householdId: true },
  });

  const householdIds = householdLinks.map((h) => h.householdId);
  const fromHousehold =
    householdIds.length === 0
      ? []
      : await prisma.householdMember.findMany({
          where: {
            householdId: { in: householdIds },
            relation: { in: ["Head", "Spouse"] },
            memberId: { not: childMemberId },
          },
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                memberNumber: true,
                phone: true,
              },
            },
          },
        });

  const byId = new Map<
    string,
    {
      id: string;
      firstName: string;
      lastName: string;
      memberNumber: string | null;
      phone: string | null;
      source: "explicit" | "household";
      relationship: string | null;
    }
  >();

  for (const row of explicit) {
    byId.set(row.guardian.id, {
      ...row.guardian,
      source: "explicit",
      relationship: row.relationship,
    });
  }
  for (const row of fromHousehold) {
    if (!byId.has(row.member.id)) {
      byId.set(row.member.id, {
        ...row.member,
        source: "household",
        relationship: row.relation,
      });
    }
  }

  return [...byId.values()];
}

/** Children linked to a guardian (explicit + household). */
export async function resolveChildrenForGuardian(guardianMemberId: string) {
  const explicit = await prisma.childGuardian.findMany({
    where: { guardianMemberId, canPickup: true },
    include: {
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          memberNumber: true,
          dateOfBirth: true,
          status: true,
          branchId: true,
        },
      },
    },
  });

  const householdLinks = await prisma.householdMember.findMany({
    where: {
      memberId: guardianMemberId,
      relation: { in: ["Head", "Spouse"] },
    },
    select: { householdId: true },
  });

  const householdIds = householdLinks.map((h) => h.householdId);
  const fromHousehold =
    householdIds.length === 0
      ? []
      : await prisma.householdMember.findMany({
          where: {
            householdId: { in: householdIds },
            relation: { in: ["Child", "Dependent"] },
            memberId: { not: guardianMemberId },
          },
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                memberNumber: true,
                dateOfBirth: true,
                status: true,
                branchId: true,
              },
            },
          },
        });

  const byId = new Map<string, (typeof explicit)[0]["child"]>();
  for (const row of explicit) {
    if (row.child.status === "Active" || row.child.status === "Visitor") {
      byId.set(row.child.id, row.child);
    }
  }
  for (const row of fromHousehold) {
    if (row.member.status === "Active" || row.member.status === "Visitor") {
      byId.set(row.member.id, row.member);
    }
  }
  return [...byId.values()];
}

async function uniquePickupCode(sessionId: string): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = newPickupCode();
    const clash = await prisma.kidsCheckInRecord.findUnique({
      where: {
        sessionId_pickupCode: { sessionId, pickupCode: code },
      },
      select: { id: true },
    });
    if (!clash) return code;
  }
  return randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

export async function checkInChild(input: {
  sessionId: string;
  childMemberId: string;
  roomId?: string | null;
  source?: AttendanceCheckInSource;
  actorId?: string | null;
  guardianMemberId?: string | null;
  notes?: string | null;
}) {
  const session = await prisma.kidsCheckInSession.findUnique({
    where: { id: input.sessionId },
  });
  if (!session) {
    return { ok: false as const, error: "Children’s session not found." };
  }
  if (!session.kioskEnabled) {
    return { ok: false as const, error: "Check-in is closed for this session." };
  }

  const existing = await prisma.kidsCheckInRecord.findUnique({
    where: {
      sessionId_childMemberId: {
        sessionId: input.sessionId,
        childMemberId: input.childMemberId,
      },
    },
  });
  if (existing && existing.status === "CheckedIn") {
    return {
      ok: false as const,
      error: "This child is already checked in.",
      record: existing,
    };
  }

  const pickupCode = await uniquePickupCode(input.sessionId);
  const roomId = input.roomId ?? session.roomId ?? null;

  const record = existing
    ? await prisma.kidsCheckInRecord.update({
        where: { id: existing.id },
        data: {
          status: "CheckedIn",
          source: input.source ?? "Manual",
          pickupCode,
          roomId,
          checkedInAt: new Date(),
          checkedInById: input.actorId ?? null,
          checkedInByGuardianId: input.guardianMemberId ?? null,
          releasedAt: null,
          releasedById: null,
          releasedToGuardianId: null,
          notes: input.notes ?? null,
        },
        include: {
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              memberNumber: true,
            },
          },
          room: { select: { id: true, name: true } },
        },
      })
    : await prisma.kidsCheckInRecord.create({
        data: {
          sessionId: input.sessionId,
          childMemberId: input.childMemberId,
          roomId,
          status: "CheckedIn",
          source: input.source ?? "Manual",
          pickupCode,
          checkedInById: input.actorId ?? null,
          checkedInByGuardianId: input.guardianMemberId ?? null,
          notes: input.notes ?? null,
        },
        include: {
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              memberNumber: true,
            },
          },
          room: { select: { id: true, name: true } },
        },
      });

  return { ok: true as const, record, session };
}

export async function releaseChildByPickupCode(input: {
  sessionId: string;
  pickupCode: string;
  actorId: string;
  guardianMemberId?: string | null;
}) {
  const code = input.pickupCode.trim().toUpperCase();
  const record = await prisma.kidsCheckInRecord.findUnique({
    where: {
      sessionId_pickupCode: {
        sessionId: input.sessionId,
        pickupCode: code,
      },
    },
    include: {
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          memberNumber: true,
        },
      },
    },
  });

  if (!record) {
    return { ok: false as const, error: "No matching pickup tag for this session." };
  }
  if (record.status !== "CheckedIn") {
    return {
      ok: false as const,
      error: `Child is already ${record.status.toLowerCase()}.`,
    };
  }

  if (input.guardianMemberId) {
    const guardians = await resolveGuardiansForChild(record.childMemberId);
    const allowed = guardians.some((g) => g.id === input.guardianMemberId);
    if (!allowed) {
      return {
        ok: false as const,
        error: "That person is not an authorised guardian for this child.",
      };
    }
  }

  const updated = await prisma.kidsCheckInRecord.update({
    where: { id: record.id },
    data: {
      status: "Released",
      releasedAt: new Date(),
      releasedById: input.actorId,
      releasedToGuardianId: input.guardianMemberId ?? null,
    },
    include: {
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          memberNumber: true,
        },
      },
      releasedToGuardian: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "kids.release",
    entityType: "KidsCheckInRecord",
    entityId: updated.id,
    metadata: { pickupCode: code, sessionId: input.sessionId },
  });

  return { ok: true as const, record: updated };
}

export async function publicKidsCheckInByToken(input: {
  token: string;
  guardianMemberNumber: string;
  childMemberId: string;
  source?: AttendanceCheckInSource;
}) {
  const session = await prisma.kidsCheckInSession.findUnique({
    where: { checkInToken: input.token },
  });
  if (!session) {
    return { ok: false as const, error: "Check-in session not found." };
  }
  if (!session.kioskEnabled) {
    return { ok: false as const, error: "Check-in is closed for this session." };
  }

  const guardian = await prisma.member.findFirst({
    where: {
      memberNumber: {
        equals: input.guardianMemberNumber.trim(),
        mode: "insensitive",
      },
      branchId: session.branchId,
      status: { in: ["Active", "Visitor"] },
    },
    select: { id: true, firstName: true, lastName: true, memberNumber: true },
  });
  if (!guardian) {
    return {
      ok: false as const,
      error: "No matching guardian member number for this branch.",
    };
  }

  const children = await resolveChildrenForGuardian(guardian.id);
  const child = children.find((c) => c.id === input.childMemberId);
  if (!child) {
    return {
      ok: false as const,
      error: "That child is not linked to this guardian.",
    };
  }
  if (child.branchId !== session.branchId) {
    return {
      ok: false as const,
      error: "Child is not registered at this branch.",
    };
  }

  const result = await checkInChild({
    sessionId: session.id,
    childMemberId: child.id,
    source: input.source ?? "Mobile",
    guardianMemberId: guardian.id,
  });

  if (!result.ok) return result;

  return {
    ok: true as const,
    record: result.record,
    guardian,
    session: { id: session.id, label: session.label },
  };
}

export async function listChildrenForGuardianByNumber(
  token: string,
  guardianMemberNumber: string,
) {
  const session = await prisma.kidsCheckInSession.findUnique({
    where: { checkInToken: token },
  });
  if (!session || !session.kioskEnabled) {
    return { ok: false as const, error: "Session not available." };
  }

  const guardian = await prisma.member.findFirst({
    where: {
      memberNumber: {
        equals: guardianMemberNumber.trim(),
        mode: "insensitive",
      },
      branchId: session.branchId,
      status: { in: ["Active", "Visitor"] },
    },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!guardian) {
    return { ok: false as const, error: "Guardian not found for this branch." };
  }

  const children = (await resolveChildrenForGuardian(guardian.id)).filter(
    (c) => c.branchId === session.branchId,
  );

  return { ok: true as const, guardian, children };
}

export async function searchChildren(q: string, branchId?: string) {
  const under18 = new Date();
  under18.setFullYear(under18.getFullYear() - 18);

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
        {
          OR: [
            { households: { some: { relation: { in: ["Child", "Dependent"] } } } },
            { childGuardianOf: { some: {} } },
            { dateOfBirth: { gte: under18 } },
          ],
        },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      memberNumber: true,
      dateOfBirth: true,
    },
    take: 20,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function setKidsKioskEnabled(
  sessionId: string,
  enabled: boolean,
  actorId: string,
) {
  const session = await prisma.kidsCheckInSession.update({
    where: { id: sessionId },
    data: { kioskEnabled: enabled },
  });
  await writeAuditLog({
    actorId,
    action: enabled ? "kids.kiosk_enable" : "kids.kiosk_disable",
    entityType: "KidsCheckInSession",
    entityId: sessionId,
  });
  return session;
}

export async function ensureKidsCheckInToken(sessionId: string, actorId: string) {
  const existing = await prisma.kidsCheckInSession.findUnique({
    where: { id: sessionId },
    select: { id: true, checkInToken: true },
  });
  if (!existing) return null;
  if (existing.checkInToken) return existing.checkInToken;
  const token = newCheckInToken();
  await prisma.kidsCheckInSession.update({
    where: { id: sessionId },
    data: { checkInToken: token, kioskEnabled: true },
  });
  await writeAuditLog({
    actorId,
    action: "kids.token_issue",
    entityType: "KidsCheckInSession",
    entityId: sessionId,
  });
  return token;
}
