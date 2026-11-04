"use server";

import { revalidatePath } from "next/cache";
import type { PastoralNoteKind } from "@prisma/client";
import { AuthGuardError, requirePastoralAccess } from "@/lib/auth-guards";
import { createPastoralNote } from "@/lib/pastoral/service";

export type PastoralActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createPastoralNoteAction(
  _prev: PastoralActionResult | null,
  formData: FormData,
): Promise<PastoralActionResult> {
  try {
    const session = await requirePastoralAccess();
    const kind = String(formData.get("kind") || "Prayer") as PastoralNoteKind;
    const title = String(formData.get("title") || "").trim();
    const body = String(formData.get("body") || "").trim();
    const memberId = String(formData.get("memberId") || "") || null;
    const occurredOnRaw = String(formData.get("occurredOn") || "");
    const isPrivate = formData.get("isPrivate") !== "false";

    if (!title || !body) {
      return { ok: false, error: "Title and notes are required." };
    }

    await createPastoralNote({
      kind,
      title,
      body,
      memberId,
      occurredOn: occurredOnRaw
        ? new Date(`${occurredOnRaw}T00:00:00.000Z`)
        : new Date(),
      isPrivate,
      actorId: session.user.id,
    });

    revalidatePath("/pastoral");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save note",
    };
  }
}
