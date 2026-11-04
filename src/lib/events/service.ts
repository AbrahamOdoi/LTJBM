import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

export async function listUpcomingEvents(limit = 40) {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - 1);
  return prisma.churchEvent.findMany({
    where: { startsAt: { gte: now } },
    orderBy: { startsAt: "asc" },
    take: limit,
    include: {
      branch: { select: { id: true, name: true } },
      _count: { select: { registrations: true } },
    },
  });
}

export async function listRecentEvents(limit = 20) {
  return prisma.churchEvent.findMany({
    orderBy: { startsAt: "desc" },
    take: limit,
    include: {
      branch: { select: { id: true, name: true } },
      _count: { select: { registrations: true } },
    },
  });
}

export async function getChurchEvent(id: string) {
  return prisma.churchEvent.findUnique({
    where: { id },
    include: {
      branch: true,
      registrations: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createChurchEvent(input: {
  title: string;
  description?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  location?: string | null;
  branchId?: string | null;
  capacity?: number | null;
  actorId: string;
}) {
  const event = await prisma.churchEvent.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      location: input.location ?? null,
      branchId: input.branchId ?? null,
      capacity: input.capacity ?? null,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "event.create",
    entityType: "ChurchEvent",
    entityId: event.id,
  });
  return event;
}

export async function registerForEvent(input: {
  eventId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  memberId?: string | null;
  notes?: string | null;
  actorId: string;
}) {
  const reg = await prisma.eventRegistration.create({
    data: {
      eventId: input.eventId,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      memberId: input.memberId ?? null,
      notes: input.notes ?? null,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "event.register",
    entityType: "EventRegistration",
    entityId: reg.id,
    metadata: { eventId: input.eventId },
  });
  return reg;
}
