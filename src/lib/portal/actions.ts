"use server";

import { revalidatePath } from "next/cache";
import { AuthGuardError, requirePortalAccess } from "@/lib/auth-guards";
import { writeAuditLog } from "@/lib/audit";
import { updatePortalProfile } from "@/lib/portal/service";

export type PortalActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updatePortalProfileAction(
  _prev: PortalActionResult | null,
  formData: FormData,
): Promise<PortalActionResult> {
  try {
    const session = await requirePortalAccess();
    const memberId = session.user.memberId!;
    const empty = (v: FormDataEntryValue | null) => {
      const s = String(v ?? "").trim();
      return s === "" ? null : s;
    };

    await updatePortalProfile(memberId, {
      phone: empty(formData.get("phone")),
      email: empty(formData.get("email")),
      addressLine1: empty(formData.get("addressLine1")),
      addressLine2: empty(formData.get("addressLine2")),
      city: empty(formData.get("city")),
      region: empty(formData.get("region")),
    });

    await writeAuditLog({
      actorId: session.user.id,
      action: "portal.profile_update",
      entityType: "Member",
      entityId: memberId,
    });

    revalidatePath("/portal");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}
