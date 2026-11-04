import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

export async function listFacilityRooms(opts?: { activeOnly?: boolean }) {
  return prisma.facilityRoom.findMany({
    where: opts?.activeOnly === false ? undefined : { isActive: true },
    orderBy: [{ name: "asc" }],
    include: {
      branch: { select: { id: true, name: true, code: true } },
      _count: { select: { bookings: true } },
    },
  });
}

export async function getFacilityRoom(id: string) {
  return prisma.facilityRoom.findUnique({
    where: { id },
    include: {
      branch: true,
      bookings: {
        orderBy: { startsAt: "desc" },
        take: 40,
        include: {
          event: { select: { id: true, title: true } },
        },
      },
    },
  });
}

export async function createFacilityRoom(input: {
  name: string;
  code?: string | null;
  branchId?: string | null;
  capacity?: number | null;
  location?: string | null;
  notes?: string | null;
  actorId: string;
}) {
  const room = await prisma.facilityRoom.create({
    data: {
      name: input.name,
      code: input.code ?? null,
      branchId: input.branchId || null,
      capacity: input.capacity ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "facility.room_create",
    entityType: "FacilityRoom",
    entityId: room.id,
  });
  return room;
}

export async function listUpcomingBookings(limit = 40) {
  const now = new Date();
  return prisma.roomBooking.findMany({
    where: { endsAt: { gte: now } },
    orderBy: { startsAt: "asc" },
    take: limit,
    include: {
      room: {
        select: {
          id: true,
          name: true,
          location: true,
          branch: { select: { name: true } },
        },
      },
      event: { select: { id: true, title: true } },
    },
  });
}

async function hasBookingConflict(
  roomId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
) {
  const clash = await prisma.roomBooking.findFirst({
    where: {
      roomId,
      id: excludeId ? { not: excludeId } : undefined,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true, title: true, startsAt: true, endsAt: true },
  });
  return clash;
}

export async function createRoomBooking(input: {
  roomId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  bookedBy?: string | null;
  notes?: string | null;
  eventId?: string | null;
  actorId: string;
}) {
  if (input.endsAt <= input.startsAt) {
    throw new Error("Booking end must be after start.");
  }
  const conflict = await hasBookingConflict(
    input.roomId,
    input.startsAt,
    input.endsAt,
  );
  if (conflict) {
    throw new Error(
      `Room already booked (“${conflict.title}”) in that window.`,
    );
  }

  const booking = await prisma.roomBooking.create({
    data: {
      roomId: input.roomId,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      bookedBy: input.bookedBy ?? null,
      notes: input.notes ?? null,
      eventId: input.eventId || null,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "facility.booking_create",
    entityType: "RoomBooking",
    entityId: booking.id,
    metadata: { roomId: input.roomId },
  });
  return booking;
}
