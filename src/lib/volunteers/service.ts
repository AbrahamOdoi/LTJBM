import type {
  VolunteerAssignmentStatus,
  VolunteerTeamKind,
} from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

export async function listVolunteerTeams(opts?: {
  kind?: VolunteerTeamKind | null;
  q?: string | null;
}) {
  return prisma.volunteerTeam.findMany({
    where: {
      isActive: true,
      ...(opts?.kind ? { kind: opts.kind } : {}),
      ...(opts?.q
        ? { name: { contains: opts.q, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    include: {
      branch: { select: { id: true, name: true, code: true } },
      roles: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { roles: true } },
    },
  });
}

export async function getVolunteerTeam(id: string) {
  return prisma.volunteerTeam.findUnique({
    where: { id },
    include: {
      branch: true,
      roles: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { needs: true } },
        },
      },
    },
  });
}

export async function createVolunteerTeam(input: {
  name: string;
  kind: VolunteerTeamKind;
  description?: string | null;
  branchId?: string | null;
  actorId: string;
}) {
  const team = await prisma.volunteerTeam.create({
    data: {
      name: input.name,
      kind: input.kind,
      description: input.description ?? null,
      branchId: input.branchId ?? null,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "volunteers.team_create",
    entityType: "VolunteerTeam",
    entityId: team.id,
  });
  return team;
}

export async function addVolunteerRole(input: {
  teamId: string;
  name: string;
  description?: string | null;
  defaultSlots?: number;
  actorId: string;
}) {
  const role = await prisma.volunteerRole.create({
    data: {
      teamId: input.teamId,
      name: input.name,
      description: input.description ?? null,
      defaultSlots: input.defaultSlots ?? 1,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "volunteers.role_create",
    entityType: "VolunteerRole",
    entityId: role.id,
  });
  return role;
}

export async function listVolunteerServices(limit = 40) {
  return prisma.volunteerService.findMany({
    orderBy: { startsAt: "desc" },
    take: limit,
    include: {
      branch: { select: { id: true, name: true, code: true } },
      needs: {
        include: {
          role: {
            include: { team: { select: { id: true, name: true, kind: true } } },
          },
          _count: {
            select: {
              assignments: {
                where: { status: { in: ["SignedUp", "Confirmed"] } },
              },
            },
          },
        },
      },
    },
  });
}

export async function getVolunteerService(id: string) {
  return prisma.volunteerService.findUnique({
    where: { id },
    include: {
      branch: true,
      needs: {
        include: {
          role: {
            include: { team: { select: { id: true, name: true, kind: true } } },
          },
          assignments: {
            where: { status: { not: "Cancelled" } },
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
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createVolunteerService(input: {
  label: string;
  startsAt: Date;
  endsAt?: Date | null;
  branchId?: string | null;
  location?: string | null;
  notes?: string | null;
  actorId: string;
}) {
  const service = await prisma.volunteerService.create({
    data: {
      label: input.label,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      branchId: input.branchId ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "volunteers.service_create",
    entityType: "VolunteerService",
    entityId: service.id,
  });
  return service;
}

export async function addNeedToService(input: {
  serviceId: string;
  roleId: string;
  slotsNeeded: number;
  notes?: string | null;
  actorId: string;
}) {
  const need = await prisma.volunteerNeed.upsert({
    where: {
      serviceId_roleId: {
        serviceId: input.serviceId,
        roleId: input.roleId,
      },
    },
    create: {
      serviceId: input.serviceId,
      roleId: input.roleId,
      slotsNeeded: input.slotsNeeded,
      notes: input.notes ?? null,
    },
    update: {
      slotsNeeded: input.slotsNeeded,
      notes: input.notes ?? null,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "volunteers.need_upsert",
    entityType: "VolunteerNeed",
    entityId: need.id,
  });
  return need;
}

function rangesOverlap(
  aStart: Date,
  aEnd: Date | null,
  bStart: Date,
  bEnd: Date | null,
): boolean {
  const aE = aEnd ?? new Date(aStart.getTime() + 3 * 3600000);
  const bE = bEnd ?? new Date(bStart.getTime() + 3 * 3600000);
  return aStart < bE && bStart < aE;
}

/**
 * Active assignments for a member that overlap the given service window.
 */
export async function findAssignmentConflicts(input: {
  memberId: string;
  serviceId: string;
  excludeNeedId?: string | null;
}) {
  const service = await prisma.volunteerService.findUnique({
    where: { id: input.serviceId },
  });
  if (!service) return [];

  const others = await prisma.volunteerAssignment.findMany({
    where: {
      memberId: input.memberId,
      status: { in: ["SignedUp", "Confirmed"] },
      ...(input.excludeNeedId
        ? { needId: { not: input.excludeNeedId } }
        : {}),
      need: { serviceId: { not: input.serviceId } },
    },
    include: {
      need: {
        include: {
          service: true,
          role: {
            include: { team: { select: { name: true, kind: true } } },
          },
        },
      },
    },
  });

  return others.filter((a) =>
    rangesOverlap(
      service.startsAt,
      service.endsAt,
      a.need.service.startsAt,
      a.need.service.endsAt,
    ),
  );
}

export async function assignVolunteer(input: {
  needId: string;
  memberId: string;
  status?: VolunteerAssignmentStatus;
  notes?: string | null;
  actorId: string;
  allowConflict?: boolean;
}) {
  const need = await prisma.volunteerNeed.findUnique({
    where: { id: input.needId },
    include: {
      service: true,
      assignments: {
        where: { status: { in: ["SignedUp", "Confirmed"] } },
      },
    },
  });
  if (!need) {
    return { ok: false as const, error: "Role need not found." };
  }

  const already = need.assignments.find((a) => a.memberId === input.memberId);
  if (already) {
    return { ok: false as const, error: "Volunteer is already assigned here." };
  }

  const filled = need.assignments.length;
  if (filled >= need.slotsNeeded) {
    return {
      ok: false as const,
      error: `All ${need.slotsNeeded} slot(s) are filled for this role.`,
    };
  }

  const conflicts = await findAssignmentConflicts({
    memberId: input.memberId,
    serviceId: need.serviceId,
    excludeNeedId: input.needId,
  });

  if (conflicts.length > 0 && !input.allowConflict) {
    return {
      ok: false as const,
      error: "Schedule conflict",
      conflicts: conflicts.map((c) => ({
        serviceLabel: c.need.service.label,
        roleName: c.need.role.name,
        teamName: c.need.role.team.name,
        startsAt: c.need.service.startsAt.toISOString(),
      })),
    };
  }

  const assignment = await prisma.volunteerAssignment.create({
    data: {
      needId: input.needId,
      memberId: input.memberId,
      status: input.status ?? "SignedUp",
      notes:
        input.notes ??
        (conflicts.length > 0
          ? `Assigned with conflict override (${conflicts.length})`
          : null),
    },
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
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "volunteers.assign",
    entityType: "VolunteerAssignment",
    entityId: assignment.id,
    metadata: {
      needId: input.needId,
      conflictOverride: conflicts.length > 0,
    },
  });

  return {
    ok: true as const,
    assignment,
    conflicts: conflicts.map((c) => ({
      serviceLabel: c.need.service.label,
      roleName: c.need.role.name,
      teamName: c.need.role.team.name,
    })),
  };
}

export async function updateAssignmentStatus(input: {
  assignmentId: string;
  status: VolunteerAssignmentStatus;
  actorId: string;
}) {
  const assignment = await prisma.volunteerAssignment.update({
    where: { id: input.assignmentId },
    data: { status: input.status },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "volunteers.assignment_status",
    entityType: "VolunteerAssignment",
    entityId: assignment.id,
    metadata: { status: input.status },
  });
  return assignment;
}

export async function searchMembersForVolunteers(q: string, branchId?: string) {
  return prisma.member.findMany({
    where: {
      AND: [
        branchId ? { branchId } : {},
        { status: { in: ["Active"] } },
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
      phone: true,
    },
    take: 20,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function listRolesForPicker() {
  return prisma.volunteerRole.findMany({
    where: { isActive: true, team: { isActive: true } },
    orderBy: [{ team: { name: "asc" } }, { sortOrder: "asc" }],
    include: {
      team: { select: { id: true, name: true, kind: true } },
    },
  });
}
