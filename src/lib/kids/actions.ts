"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthGuardError, requireAttendanceWrite } from "@/lib/auth-guards";
import {
  checkInChild,
  createKidsRoom,
  createKidsSession,
  ensureKidsCheckInToken,
  linkChildGuardian,
  listChildrenForGuardianByNumber,
  publicKidsCheckInByToken,
  releaseChildByPickupCode,
  setKidsKioskEnabled,
} from "@/lib/kids/service";

export type KidsActionResult =
  | { ok: true; message?: string; pickupCode?: string }
  | { ok: false; error: string };

function isRedirect(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function createKidsSessionAction(
  _prev: KidsActionResult | null,
  formData: FormData,
): Promise<KidsActionResult> {
  try {
    const session = await requireAttendanceWrite();
    const label = String(formData.get("label") || "").trim();
    const heldAtRaw = String(formData.get("heldAt") || "");
    const branchId = String(formData.get("branchId") || "");
    const roomId = String(formData.get("roomId") || "") || null;
    const attendanceSessionId =
      String(formData.get("attendanceSessionId") || "") || null;
    const notes = String(formData.get("notes") || "").trim() || null;

    if (!label || !heldAtRaw || !branchId) {
      return { ok: false, error: "Label, date, and branch are required." };
    }

    const created = await createKidsSession({
      label,
      heldAt: new Date(`${heldAtRaw}T00:00:00.000Z`),
      branchId,
      roomId,
      attendanceSessionId,
      notes,
      actorId: session.user.id,
    });

    revalidatePath("/attendance/kids");
    redirect(`/attendance/kids/${created.id}`);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    if (isRedirect(error)) throw error;
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create session",
    };
  }
}

export async function createKidsRoomAction(
  _prev: KidsActionResult | null,
  formData: FormData,
): Promise<KidsActionResult> {
  try {
    const session = await requireAttendanceWrite();
    const name = String(formData.get("name") || "").trim();
    const branchId = String(formData.get("branchId") || "") || null;
    if (!name) return { ok: false, error: "Room name is required." };

    await createKidsRoom({
      name,
      branchId,
      code: String(formData.get("code") || "").trim() || null,
      ageMinYears: formData.get("ageMinYears")
        ? Number(formData.get("ageMinYears"))
        : null,
      ageMaxYears: formData.get("ageMaxYears")
        ? Number(formData.get("ageMaxYears"))
        : null,
      capacity: formData.get("capacity")
        ? Number(formData.get("capacity"))
        : null,
      notes: String(formData.get("notes") || "").trim() || null,
      actorId: session.user.id,
    });
    revalidatePath("/attendance/kids");
    return { ok: true, message: "Classroom saved." };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save room",
    };
  }
}

export async function linkGuardianAction(
  _prev: KidsActionResult | null,
  formData: FormData,
): Promise<KidsActionResult> {
  try {
    const session = await requireAttendanceWrite();
    const childMemberId = String(formData.get("childMemberId") || "");
    const guardianMemberId = String(formData.get("guardianMemberId") || "");
    if (!childMemberId || !guardianMemberId) {
      return { ok: false, error: "Child and guardian are required." };
    }
    await linkChildGuardian({
      childMemberId,
      guardianMemberId,
      relationship: String(formData.get("relationship") || "").trim() || null,
      canPickup: String(formData.get("canPickup") || "1") !== "0",
      actorId: session.user.id,
    });
    revalidatePath("/attendance/kids");
    return { ok: true, message: "Guardian linked." };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to link guardian",
    };
  }
}

export async function staffCheckInChildAction(formData: FormData) {
  const session = await requireAttendanceWrite();
  const sessionId = String(formData.get("sessionId") || "");
  const childMemberId = String(formData.get("childMemberId") || "");
  const roomId = String(formData.get("roomId") || "") || null;
  const sourceRaw = String(formData.get("source") || "Kiosk");
  const source =
    sourceRaw === "Kiosk" ||
    sourceRaw === "Mobile" ||
    sourceRaw === "Qr" ||
    sourceRaw === "Manual"
      ? sourceRaw
      : "Kiosk";
  if (!sessionId || !childMemberId) return;

  await checkInChild({
    sessionId,
    childMemberId,
    roomId,
    source,
    actorId: session.user.id,
  });
  revalidatePath(`/attendance/kids/${sessionId}`);
  revalidatePath(`/attendance/kids/${sessionId}/kiosk`);
  revalidatePath(`/attendance/kids/${sessionId}/release`);
}

export async function releaseByCodeAction(
  _prev: KidsActionResult | null,
  formData: FormData,
): Promise<KidsActionResult> {
  try {
    const session = await requireAttendanceWrite();
    const sessionId = String(formData.get("sessionId") || "");
    const pickupCode = String(formData.get("pickupCode") || "");
    const guardianMemberId =
      String(formData.get("guardianMemberId") || "") || null;
    if (!sessionId || !pickupCode) {
      return { ok: false, error: "Session and pickup code are required." };
    }
    const result = await releaseChildByPickupCode({
      sessionId,
      pickupCode,
      actorId: session.user.id,
      guardianMemberId,
    });
    if (!result.ok) return result;
    revalidatePath(`/attendance/kids/${sessionId}`);
    revalidatePath(`/attendance/kids/${sessionId}/release`);
    return {
      ok: true,
      message: `Released ${result.record.child.firstName} ${result.record.child.lastName}.`,
    };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Release failed",
    };
  }
}

export async function toggleKidsKioskAction(formData: FormData) {
  const session = await requireAttendanceWrite();
  const sessionId = String(formData.get("sessionId") || "");
  const enabled = String(formData.get("enabled") || "") === "1";
  if (!sessionId) return;
  await setKidsKioskEnabled(sessionId, enabled, session.user.id);
  revalidatePath(`/attendance/kids/${sessionId}`);
  revalidatePath(`/attendance/kids/${sessionId}/kiosk`);
}

export async function issueKidsTokenAction(formData: FormData) {
  const session = await requireAttendanceWrite();
  const sessionId = String(formData.get("sessionId") || "");
  if (!sessionId) return;
  await ensureKidsCheckInToken(sessionId, session.user.id);
  revalidatePath(`/attendance/kids/${sessionId}`);
  revalidatePath(`/attendance/kids/${sessionId}/kiosk`);
}

export type PublicKidsLookupResult =
  | {
      ok: true;
      guardianName: string;
      children: Array<{
        id: string;
        firstName: string;
        lastName: string;
        memberNumber: string | null;
      }>;
    }
  | { ok: false; error: string };

export async function publicKidsLookupAction(
  _prev: PublicKidsLookupResult | null,
  formData: FormData,
): Promise<PublicKidsLookupResult> {
  const token = String(formData.get("token") || "").trim();
  const guardianMemberNumber = String(
    formData.get("guardianMemberNumber") || "",
  ).trim();
  if (!token || !guardianMemberNumber) {
    return { ok: false, error: "Session and guardian member number required." };
  }
  const result = await listChildrenForGuardianByNumber(
    token,
    guardianMemberNumber,
  );
  if (!result.ok) return result;
  return {
    ok: true,
    guardianName: `${result.guardian.firstName} ${result.guardian.lastName}`,
    children: result.children.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      memberNumber: c.memberNumber,
    })),
  };
}

export type PublicKidsCheckInResult =
  | {
      ok: true;
      childName: string;
      pickupCode: string;
      sessionLabel: string;
    }
  | { ok: false; error: string };

export async function publicKidsCheckInAction(
  _prev: PublicKidsCheckInResult | null,
  formData: FormData,
): Promise<PublicKidsCheckInResult> {
  const token = String(formData.get("token") || "").trim();
  const guardianMemberNumber = String(
    formData.get("guardianMemberNumber") || "",
  ).trim();
  const childMemberId = String(formData.get("childMemberId") || "").trim();
  const sourceRaw = String(formData.get("source") || "Mobile");
  const source =
    sourceRaw === "Qr" || sourceRaw === "Mobile" || sourceRaw === "Kiosk"
      ? sourceRaw
      : "Mobile";

  if (!token || !guardianMemberNumber || !childMemberId) {
    return {
      ok: false,
      error: "Guardian number and child selection are required.",
    };
  }

  const result = await publicKidsCheckInByToken({
    token,
    guardianMemberNumber,
    childMemberId,
    source,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    childName: `${result.record.child.firstName} ${result.record.child.lastName}`,
    pickupCode: result.record.pickupCode,
    sessionLabel: result.session.label,
  };
}
