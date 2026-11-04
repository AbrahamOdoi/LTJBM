"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthGuardError, requireEventsWrite } from "@/lib/auth-guards";
import {
  createFacilityRoom,
  createRoomBooking,
} from "@/lib/facilities/service";

export type FacilityActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createRoomAction(
  _prev: FacilityActionResult | null,
  formData: FormData,
): Promise<FacilityActionResult> {
  try {
    const session = await requireEventsWrite();
    const name = String(formData.get("name") || "").trim();
    if (!name) return { ok: false, error: "Room name is required." };

    const room = await createFacilityRoom({
      name,
      code: String(formData.get("code") || "").trim() || null,
      branchId: String(formData.get("branchId") || "") || null,
      capacity: String(formData.get("capacity") || "")
        ? Number(formData.get("capacity"))
        : null,
      location: String(formData.get("location") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
      actorId: session.user.id,
    });

    revalidatePath("/events/rooms");
    redirect(`/events/rooms/${room.id}`);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create room",
    };
  }
}

export async function createBookingAction(
  _prev: FacilityActionResult | null,
  formData: FormData,
): Promise<FacilityActionResult> {
  try {
    const session = await requireEventsWrite();
    const roomId = String(formData.get("roomId") || "");
    const title = String(formData.get("title") || "").trim();
    const startsAtRaw = String(formData.get("startsAt") || "");
    const endsAtRaw = String(formData.get("endsAt") || "");

    if (!roomId || !title || !startsAtRaw || !endsAtRaw) {
      return { ok: false, error: "Room, title, start, and end are required." };
    }

    const startsAt = new Date(startsAtRaw);
    const endsAt = new Date(endsAtRaw);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return { ok: false, error: "Invalid start or end time." };
    }

    await createRoomBooking({
      roomId,
      title,
      startsAt,
      endsAt,
      bookedBy: String(formData.get("bookedBy") || "").trim() || session.user.name,
      notes: String(formData.get("notes") || "").trim() || null,
      eventId: String(formData.get("eventId") || "") || null,
      actorId: session.user.id,
    });

    revalidatePath("/events/rooms");
    revalidatePath(`/events/rooms/${roomId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to book room",
    };
  }
}
