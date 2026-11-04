"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AttendanceKind } from "@prisma/client";
import {
  AuthGuardError,
  requireAttendanceWrite,
} from "@/lib/auth-guards";
import {
  createAttendanceSession,
  markAttendance,
} from "@/lib/attendance/service";

export type AttendanceActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createSessionAction(
  _prev: AttendanceActionResult | null,
  formData: FormData,
): Promise<AttendanceActionResult> {
  try {
    const session = await requireAttendanceWrite();
    const kind = String(formData.get("kind") || "Service") as AttendanceKind;
    const label = String(formData.get("label") || "").trim();
    const heldAtRaw = String(formData.get("heldAt") || "");
    const branchId = String(formData.get("branchId") || "");
    const cellId = String(formData.get("cellId") || "") || null;
    const headcountRaw = String(formData.get("headcount") || "");
    const notes = String(formData.get("notes") || "").trim() || null;

    if (!label || !heldAtRaw || !branchId) {
      return { ok: false, error: "Label, date, and branch are required." };
    }

    const heldAt = new Date(`${heldAtRaw}T00:00:00.000Z`);
    const created = await createAttendanceSession({
      kind,
      label,
      heldAt,
      branchId,
      cellId: kind === "Cell" ? cellId : null,
      headcount: headcountRaw ? Number(headcountRaw) : null,
      notes,
      actorId: session.user.id,
    });

    revalidatePath("/attendance");
    redirect(`/attendance/${created.id}`);
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
      error: error instanceof Error ? error.message : "Failed to create session",
    };
  }
}

export async function markPresentAction(formData: FormData) {
  const session = await requireAttendanceWrite();
  const sessionId = String(formData.get("sessionId") || "");
  const memberId = String(formData.get("memberId") || "");
  if (!sessionId || !memberId) return;

  await markAttendance({
    sessionId,
    memberId,
    present: true,
    actorId: session.user.id,
  });
  revalidatePath(`/attendance/${sessionId}`);
}
