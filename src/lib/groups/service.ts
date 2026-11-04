import type {
  CommChannelKind,
  MinistryGroupKind,
  Prisma,
} from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { stubSendMessage } from "@/lib/comms/service";
import { prisma } from "@/lib/db";

const memberBrief = {
  id: true,
  firstName: true,
  lastName: true,
  memberNumber: true,
  phone: true,
  email: true,
  branchId: true,
} satisfies Prisma.MemberSelect;

export async function listMinistryGroups(opts?: {
  kind?: MinistryGroupKind;
  branchId?: string;
  q?: string;
  includeInactive?: boolean;
}) {
  const where: Prisma.MinistryGroupWhereInput = {
    ...(opts?.includeInactive ? {} : { isActive: true }),
    ...(opts?.kind ? { kind: opts.kind } : {}),
    ...(opts?.branchId ? { branchId: opts.branchId } : {}),
    ...(opts?.q
      ? { name: { contains: opts.q, mode: "insensitive" } }
      : {}),
  };

  return prisma.ministryGroup.findMany({
    where,
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    include: {
      branch: { select: { id: true, name: true, code: true } },
      _count: {
        select: {
          roster: { where: { endedAt: null } },
          leaders: { where: { endedAt: null } },
          meetings: true,
        },
      },
    },
  });
}

export async function getMinistryGroup(id: string) {
  return prisma.ministryGroup.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      cell: { select: { id: true, name: true } },
      fellowshipMinistry: { select: { id: true, name: true, code: true } },
      leaders: {
        where: { endedAt: null },
        include: { member: { select: memberBrief } },
        orderBy: { startedAt: "asc" },
      },
      roster: {
        where: { endedAt: null },
        include: { member: { select: memberBrief } },
        orderBy: [
          { member: { lastName: "asc" } },
          { member: { firstName: "asc" } },
        ],
      },
      meetings: {
        orderBy: { heldAt: "desc" },
        take: 40,
        include: {
          recordedBy: { select: { id: true, name: true } },
        },
      },
      announcements: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
  });
}

function codeFromName(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 24);
}

/**
 * Create a hub group. Cell / Fellowship kinds optionally create legacy rows
 * so member forms, attendance, and HQ finance filters stay in sync.
 */
export async function createMinistryGroup(input: {
  name: string;
  kind: MinistryGroupKind;
  description?: string | null;
  branchId?: string | null;
  actorId: string;
  linkLegacy?: boolean;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Group name is required.");

  if (input.kind === "Cell" && !input.branchId) {
    throw new Error("Cells require a branch.");
  }

  let cellId: string | null = null;
  let fellowshipMinistryId: string | null = null;

  const linkLegacy = input.linkLegacy !== false;

  if (linkLegacy && input.kind === "Cell" && input.branchId) {
    const cell = await prisma.cell.create({
      data: { name, branchId: input.branchId },
    });
    cellId = cell.id;
  }

  if (linkLegacy && input.kind === "Fellowship") {
    const codeBase = codeFromName(name) || "FELLOWSHIP";
    let code = codeBase;
    let n = 1;
    while (await prisma.fellowshipMinistry.findUnique({ where: { code } })) {
      code = `${codeBase}_${n++}`.slice(0, 24);
    }
    const fellowship = await prisma.fellowshipMinistry.create({
      data: {
        name,
        code,
        description: input.description ?? null,
      },
    });
    fellowshipMinistryId = fellowship.id;
  }

  const group = await prisma.ministryGroup.create({
    data: {
      name,
      kind: input.kind,
      description: input.description?.trim() || null,
      branchId: input.branchId || null,
      cellId,
      fellowshipMinistryId,
    },
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "groups.create",
    entityType: "MinistryGroup",
    entityId: group.id,
    metadata: { kind: input.kind, cellId, fellowshipMinistryId },
  });

  return group;
}

/** Ensure every Cell / FellowshipMinistry has a hub MinistryGroup row. */
export async function syncLegacyGroupsToHub() {
  const [cells, fellowships] = await Promise.all([
    prisma.cell.findMany({
      include: { ministryGroup: true },
    }),
    prisma.fellowshipMinistry.findMany({
      include: { ministryGroup: true },
    }),
  ]);

  for (const cell of cells) {
    if (cell.ministryGroup) continue;
    await prisma.ministryGroup.create({
      data: {
        name: cell.name,
        kind: "Cell",
        branchId: cell.branchId,
        cellId: cell.id,
      },
    });
  }

  for (const f of fellowships) {
    if (f.ministryGroup) continue;
    const kind: MinistryGroupKind =
      f.code === "YOUTH" || /youth/i.test(f.name)
        ? "Youth"
        : "Fellowship";
    await prisma.ministryGroup.create({
      data: {
        name: f.name,
        kind,
        description: f.description,
        fellowshipMinistryId: f.id,
      },
    });
  }
}

async function syncLegacyMembership(input: {
  groupId: string;
  memberId: string;
  end?: boolean;
}) {
  const group = await prisma.ministryGroup.findUnique({
    where: { id: input.groupId },
  });
  if (!group) return;

  if (group.cellId) {
    if (input.end) {
      await prisma.groupMembership.updateMany({
        where: {
          memberId: input.memberId,
          kind: "Cell",
          cellId: group.cellId,
          endedAt: null,
        },
        data: { endedAt: new Date() },
      });
    } else {
      const open = await prisma.groupMembership.findFirst({
        where: {
          memberId: input.memberId,
          kind: "Cell",
          cellId: group.cellId,
          endedAt: null,
        },
      });
      if (!open) {
        await prisma.groupMembership.create({
          data: {
            memberId: input.memberId,
            kind: "Cell",
            cellId: group.cellId,
          },
        });
      }
    }
  }

  if (group.fellowshipMinistryId) {
    if (input.end) {
      await prisma.groupMembership.updateMany({
        where: {
          memberId: input.memberId,
          kind: "Fellowship",
          fellowshipMinistryId: group.fellowshipMinistryId,
          endedAt: null,
        },
        data: { endedAt: new Date() },
      });
    } else {
      const open = await prisma.groupMembership.findFirst({
        where: {
          memberId: input.memberId,
          kind: "Fellowship",
          fellowshipMinistryId: group.fellowshipMinistryId,
          endedAt: null,
        },
      });
      if (!open) {
        await prisma.groupMembership.create({
          data: {
            memberId: input.memberId,
            kind: "Fellowship",
            fellowshipMinistryId: group.fellowshipMinistryId,
          },
        });
      }
    }
  }
}

export async function addRosterMember(input: {
  groupId: string;
  memberId: string;
  roleNote?: string | null;
  actorId: string;
}) {
  const existing = await prisma.groupRosterEntry.findFirst({
    where: {
      groupId: input.groupId,
      memberId: input.memberId,
      endedAt: null,
    },
  });
  if (existing) return existing;

  const entry = await prisma.groupRosterEntry.create({
    data: {
      groupId: input.groupId,
      memberId: input.memberId,
      roleNote: input.roleNote?.trim() || null,
    },
  });

  await syncLegacyMembership({
    groupId: input.groupId,
    memberId: input.memberId,
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "groups.roster_add",
    entityType: "GroupRosterEntry",
    entityId: entry.id,
    metadata: { groupId: input.groupId, memberId: input.memberId },
  });

  return entry;
}

export async function removeRosterMember(input: {
  entryId: string;
  actorId: string;
}) {
  const entry = await prisma.groupRosterEntry.update({
    where: { id: input.entryId },
    data: { endedAt: new Date() },
  });

  await syncLegacyMembership({
    groupId: entry.groupId,
    memberId: entry.memberId,
    end: true,
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "groups.roster_remove",
    entityType: "GroupRosterEntry",
    entityId: entry.id,
    metadata: { groupId: entry.groupId, memberId: entry.memberId },
  });

  return entry;
}

export async function assignGroupLeader(input: {
  groupId: string;
  memberId: string;
  title?: string | null;
  notes?: string | null;
  actorId: string;
}) {
  // Ensure leader is on the roster
  await addRosterMember({
    groupId: input.groupId,
    memberId: input.memberId,
    actorId: input.actorId,
  });

  const open = await prisma.groupLeader.findFirst({
    where: {
      groupId: input.groupId,
      memberId: input.memberId,
      endedAt: null,
    },
  });
  if (open) {
    return prisma.groupLeader.update({
      where: { id: open.id },
      data: {
        title: input.title?.trim() || open.title,
        notes: input.notes?.trim() || open.notes,
      },
    });
  }

  const leader = await prisma.groupLeader.create({
    data: {
      groupId: input.groupId,
      memberId: input.memberId,
      title: input.title?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "groups.leader_assign",
    entityType: "GroupLeader",
    entityId: leader.id,
    metadata: { groupId: input.groupId, memberId: input.memberId },
  });

  return leader;
}

export async function endGroupLeader(input: {
  leaderId: string;
  actorId: string;
}) {
  const leader = await prisma.groupLeader.update({
    where: { id: input.leaderId },
    data: { endedAt: new Date() },
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "groups.leader_end",
    entityType: "GroupLeader",
    entityId: leader.id,
    metadata: { groupId: leader.groupId, memberId: leader.memberId },
  });

  return leader;
}

export async function createMeetingLog(input: {
  groupId: string;
  heldAt: Date;
  title: string;
  notes?: string | null;
  attendanceCount?: number | null;
  location?: string | null;
  actorId: string;
}) {
  const title = input.title.trim();
  if (!title) throw new Error("Meeting title is required.");

  const meeting = await prisma.groupMeetingLog.create({
    data: {
      groupId: input.groupId,
      heldAt: input.heldAt,
      title,
      notes: input.notes?.trim() || null,
      attendanceCount: input.attendanceCount ?? null,
      location: input.location?.trim() || null,
      recordedById: input.actorId,
    },
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "groups.meeting_create",
    entityType: "GroupMeetingLog",
    entityId: meeting.id,
    metadata: { groupId: input.groupId },
  });

  return meeting;
}

/**
 * In-app group announcement + stub outbox rows for roster contacts.
 * Does not call live WhatsApp / SMS / email providers.
 */
export async function postGroupAnnouncement(input: {
  groupId: string;
  title: string;
  body: string;
  channel: CommChannelKind;
  actorId: string;
  fanOutToRoster?: boolean;
}) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) throw new Error("Title and body are required.");

  const roster = await prisma.groupRosterEntry.findMany({
    where: { groupId: input.groupId, endedAt: null },
    include: { member: { select: memberBrief } },
  });

  const announcement = await prisma.groupAnnouncement.create({
    data: {
      groupId: input.groupId,
      title,
      body,
      channel: input.channel,
      outboxLogged: false,
      createdById: input.actorId,
    },
  });

  let outboxCount = 0;
  if (input.fanOutToRoster !== false) {
    for (const entry of roster) {
      const to =
        entry.member.email?.trim() ||
        entry.member.phone?.trim() ||
        `member:${entry.member.id}`;
      await stubSendMessage({
        channel: input.channel,
        templateKind: "GroupAnnounce",
        toAddress: to,
        subject: title,
        body,
        actorId: input.actorId,
        metadata: {
          groupId: input.groupId,
          announcementId: announcement.id,
          memberId: entry.member.id,
          source: "group_announcement",
        },
      });
      outboxCount += 1;
    }
  }

  const updated = await prisma.groupAnnouncement.update({
    where: { id: announcement.id },
    data: { outboxLogged: outboxCount > 0 },
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "groups.announce",
    entityType: "GroupAnnouncement",
    entityId: announcement.id,
    metadata: {
      groupId: input.groupId,
      channel: input.channel,
      outboxCount,
    },
  });

  return { announcement: updated, outboxCount };
}

export async function searchMembersForGroups(q: string, branchId?: string) {
  const trimmed = q.trim();
  if (trimmed.length < 1) return [];

  return prisma.member.findMany({
    where: {
      AND: [
        branchId ? { branchId } : {},
        {
          OR: [
            { firstName: { contains: trimmed, mode: "insensitive" } },
            { lastName: { contains: trimmed, mode: "insensitive" } },
            { memberNumber: { contains: trimmed, mode: "insensitive" } },
            { phone: { contains: trimmed, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: memberBrief,
    take: 20,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

/** Backfill hub roster from legacy GroupMembership for linked cells/fellowships. */
export async function syncRosterFromLegacyMemberships(groupId: string) {
  const group = await prisma.ministryGroup.findUnique({
    where: { id: groupId },
  });
  if (!group) return 0;

  const or: Prisma.GroupMembershipWhereInput[] = [];
  if (group.cellId) {
    or.push({ kind: "Cell", cellId: group.cellId });
  }
  if (group.fellowshipMinistryId) {
    or.push({
      kind: "Fellowship",
      fellowshipMinistryId: group.fellowshipMinistryId,
    });
  }
  if (or.length === 0) return 0;

  const memberships = await prisma.groupMembership.findMany({
    where: { endedAt: null, OR: or },
  });

  if (memberships.length === 0) return 0;

  let added = 0;
  for (const m of memberships) {
    const open = await prisma.groupRosterEntry.findFirst({
      where: {
        groupId,
        memberId: m.memberId,
        endedAt: null,
      },
    });
    if (open) continue;
    await prisma.groupRosterEntry.create({
      data: {
        groupId,
        memberId: m.memberId,
        startedAt: m.startedAt,
      },
    });
    added += 1;
  }
  return added;
}
