"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  VolunteerAssignmentStatus,
  VolunteerTeamKind,
} from "@prisma/client";
import { AuthGuardError, requireVolunteersWrite } from "@/lib/auth-guards";
import {
  addNeedToService,
  addVolunteerRole,
  assignVolunteer,
  createVolunteerService,
  createVolunteerTeam,
  updateAssignmentStatus,
} from "@/lib/volunteers/service";

export type VolunteerActionResult =
  | { ok: true; message?: string; warning?: string }
  | { ok: false; error: string; conflicts?: Array<{ serviceLabel: string; roleName: string; teamName: string }> };

function isRedirect(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

const TEAM_KINDS: VolunteerTeamKind[] = [
  "Usher",
  "Worship",
  "Hospitality",
  "Kids",
  "Media",
  "Parking",
  "Security",
  "Other",
];

export async function createTeamAction(
  _prev: VolunteerActionResult | null,
  formData: FormData,
): Promise<VolunteerActionResult> {
  try {
    const session = await requireVolunteersWrite();
    const name = String(formData.get("name") || "").trim();
    const kindRaw = String(formData.get("kind") || "Other");
    const kind = TEAM_KINDS.includes(kindRaw as VolunteerTeamKind)
      ? (kindRaw as VolunteerTeamKind)
      : "Other";
    if (!name) return { ok: false, error: "Team name is required." };

    const team = await createVolunteerTeam({
      name,
      kind,
      description: String(formData.get("description") || "").trim() || null,
      branchId: String(formData.get("branchId") || "") || null,
      actorId: session.user.id,
    });
    revalidatePath("/volunteers");
    revalidatePath("/volunteers/teams");
    redirect(`/volunteers/teams/${team.id}`);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    if (isRedirect(error)) throw error;
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create team",
    };
  }
}

export async function addRoleAction(
  _prev: VolunteerActionResult | null,
  formData: FormData,
): Promise<VolunteerActionResult> {
  try {
    const session = await requireVolunteersWrite();
    const teamId = String(formData.get("teamId") || "");
    const name = String(formData.get("name") || "").trim();
    if (!teamId || !name) {
      return { ok: false, error: "Team and role name are required." };
    }
    await addVolunteerRole({
      teamId,
      name,
      description: String(formData.get("description") || "").trim() || null,
      defaultSlots: formData.get("defaultSlots")
        ? Number(formData.get("defaultSlots"))
        : 1,
      actorId: session.user.id,
    });
    revalidatePath(`/volunteers/teams/${teamId}`);
    return { ok: true, message: "Role added." };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to add role",
    };
  }
}

export async function createServiceAction(
  _prev: VolunteerActionResult | null,
  formData: FormData,
): Promise<VolunteerActionResult> {
  try {
    const session = await requireVolunteersWrite();
    const label = String(formData.get("label") || "").trim();
    const startsAtRaw = String(formData.get("startsAt") || "");
    if (!label || !startsAtRaw) {
      return { ok: false, error: "Label and start time are required." };
    }
    const endsAtRaw = String(formData.get("endsAt") || "");
    const service = await createVolunteerService({
      label,
      startsAt: new Date(startsAtRaw),
      endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
      branchId: String(formData.get("branchId") || "") || null,
      location: String(formData.get("location") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
      actorId: session.user.id,
    });
    revalidatePath("/volunteers");
    revalidatePath("/volunteers/services");
    redirect(`/volunteers/services/${service.id}`);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    if (isRedirect(error)) throw error;
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create service",
    };
  }
}

export async function addNeedAction(
  _prev: VolunteerActionResult | null,
  formData: FormData,
): Promise<VolunteerActionResult> {
  try {
    const session = await requireVolunteersWrite();
    const serviceId = String(formData.get("serviceId") || "");
    const roleId = String(formData.get("roleId") || "");
    const slotsNeeded = Number(formData.get("slotsNeeded") || "1");
    if (!serviceId || !roleId) {
      return { ok: false, error: "Service and role are required." };
    }
    await addNeedToService({
      serviceId,
      roleId,
      slotsNeeded: Number.isFinite(slotsNeeded) && slotsNeeded > 0 ? slotsNeeded : 1,
      notes: String(formData.get("notes") || "").trim() || null,
      actorId: session.user.id,
    });
    revalidatePath(`/volunteers/services/${serviceId}`);
    return { ok: true, message: "Role need added to this service." };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to add need",
    };
  }
}

export async function assignVolunteerAction(
  _prev: VolunteerActionResult | null,
  formData: FormData,
): Promise<VolunteerActionResult> {
  try {
    const session = await requireVolunteersWrite();
    const needId = String(formData.get("needId") || "");
    const memberId = String(formData.get("memberId") || "");
    const serviceId = String(formData.get("serviceId") || "");
    const allowConflict = String(formData.get("allowConflict") || "") === "1";
    if (!needId || !memberId) {
      return { ok: false, error: "Need and volunteer are required." };
    }

    const result = await assignVolunteer({
      needId,
      memberId,
      actorId: session.user.id,
      allowConflict,
      notes: String(formData.get("notes") || "").trim() || null,
    });

    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        conflicts: "conflicts" in result ? result.conflicts : undefined,
      };
    }

    if (serviceId) revalidatePath(`/volunteers/services/${serviceId}`);
    revalidatePath("/volunteers");
    const warning =
      result.conflicts.length > 0
        ? `Assigned with overlapping schedule: ${result.conflicts
            .map((c) => `${c.teamName} · ${c.roleName} (${c.serviceLabel})`)
            .join("; ")}`
        : undefined;
    return { ok: true, message: "Volunteer assigned.", warning };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Assignment failed",
    };
  }
}

export async function setAssignmentStatusAction(formData: FormData) {
  const session = await requireVolunteersWrite();
  const assignmentId = String(formData.get("assignmentId") || "");
  const serviceId = String(formData.get("serviceId") || "");
  const statusRaw = String(formData.get("status") || "");
  const allowed: VolunteerAssignmentStatus[] = [
    "SignedUp",
    "Confirmed",
    "Declined",
    "Cancelled",
  ];
  if (!assignmentId || !allowed.includes(statusRaw as VolunteerAssignmentStatus)) {
    return;
  }
  await updateAssignmentStatus({
    assignmentId,
    status: statusRaw as VolunteerAssignmentStatus,
    actorId: session.user.id,
  });
  if (serviceId) revalidatePath(`/volunteers/services/${serviceId}`);
  revalidatePath("/volunteers");
}
