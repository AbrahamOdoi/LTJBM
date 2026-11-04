"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthGuardError, requireEventsWrite } from "@/lib/auth-guards";
import { createChurchEvent, registerForEvent } from "@/lib/events/service";

export type EventActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createEventAction(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  try {
    const session = await requireEventsWrite();
    const title = String(formData.get("title") || "").trim();
    const startsAtRaw = String(formData.get("startsAt") || "");
    if (!title || !startsAtRaw) {
      return { ok: false, error: "Title and start date are required." };
    }
    const endsAtRaw = String(formData.get("endsAt") || "");
    const capacityRaw = String(formData.get("capacity") || "");

    const created = await createChurchEvent({
      title,
      description: String(formData.get("description") || "").trim() || null,
      startsAt: new Date(startsAtRaw),
      endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
      location: String(formData.get("location") || "").trim() || null,
      branchId: String(formData.get("branchId") || "") || null,
      capacity: capacityRaw ? Number(capacityRaw) : null,
      actorId: session.user.id,
    });

    revalidatePath("/events");
    redirect(`/events/${created.id}`);
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
      error: error instanceof Error ? error.message : "Failed to create event",
    };
  }
}

export async function registerEventAction(formData: FormData) {
  const session = await requireEventsWrite();
  const eventId = String(formData.get("eventId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!eventId || !name) return;

  await registerForEvent({
    eventId,
    name,
    phone: String(formData.get("phone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
    actorId: session.user.id,
  });
  revalidatePath(`/events/${eventId}`);
}
