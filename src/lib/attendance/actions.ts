"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AttendanceKind } from "@prisma/client";
import {
  AuthGuardError,
  requireAttendanceWrite,
} from "@/lib/auth-guards";
import {
  checkInByToken,
  createAttendanceSession,
  ensureSessionCheckInToken,
  markAttendance,
  setSessionKioskEnabled,
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
  const sourceRaw = String(formData.get("source") || "Manual");
  const source =
    sourceRaw === "Kiosk" ||
    sourceRaw === "Mobile" ||
    sourceRaw === "Qr" ||
    sourceRaw === "Manual"
      ? sourceRaw
      : "Manual";
  if (!sessionId || !memberId) return;

  await markAttendance({
    sessionId,
    memberId,
    present: true,
    actorId: session.user.id,
    source,
  });
  revalidatePath(`/attendance/${sessionId}`);
  revalidatePath(`/attendance/${sessionId}/kiosk`);
}

export async function issueCheckInTokenAction(formData: FormData) {
  const session = await requireAttendanceWrite();
  const sessionId = String(formData.get("sessionId") || "");
  if (!sessionId) return;
  await ensureSessionCheckInToken(sessionId, session.user.id);
  revalidatePath(`/attendance/${sessionId}`);
  revalidatePath(`/attendance/${sessionId}/kiosk`);
}

export async function toggleKioskAction(formData: FormData) {
  const session = await requireAttendanceWrite();
  const sessionId = String(formData.get("sessionId") || "");
  const enabled = String(formData.get("enabled") || "") === "1";
  if (!sessionId) return;
  await setSessionKioskEnabled(sessionId, enabled, session.user.id);
  revalidatePath(`/attendance/${sessionId}`);
  revalidatePath(`/attendance/${sessionId}/kiosk`);
}

export type PublicCheckInResult =
  | {
      ok: true;
      memberName: string;
      memberNumber: string | null;
      sessionLabel: string;
    }
  | { ok: false; error: string };

/** Public mobile / QR check-in (no staff session required). */
export async function publicCheckInAction(
  _prev: PublicCheckInResult | null,
  formData: FormData,
): Promise<PublicCheckInResult> {
  const token = String(formData.get("token") || "").trim();
  const memberNumber = String(formData.get("memberNumber") || "").trim();
  const sourceRaw = String(formData.get("source") || "Mobile");
  const source =
    sourceRaw === "Qr" || sourceRaw === "Mobile" || sourceRaw === "Kiosk"
      ? sourceRaw
      : "Mobile";

  if (!token || !memberNumber) {
    return { ok: false, error: "Session and member number are required." };
  }

  const result = await checkInByToken({
    token,
    memberNumber,
    source,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    memberName: `${result.member?.firstName ?? ""} ${result.member?.lastName ?? ""}`.trim(),
    memberNumber: result.member?.memberNumber ?? null,
    sessionLabel: result.session.label,
  };
}
