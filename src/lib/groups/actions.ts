"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CommChannelKind, MinistryGroupKind } from "@prisma/client";
import {
  AuthGuardError,
  requireGroupsWrite,
} from "@/lib/auth-guards";
import {
  addRosterMember,
  assignGroupLeader,
  createMeetingLog,
  createMinistryGroup,
  endGroupLeader,
  postGroupAnnouncement,
  removeRosterMember,
  syncLegacyGroupsToHub,
  syncRosterFromLegacyMemberships,
} from "@/lib/groups/service";

export type GroupActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

function isRedirectError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function createGroupAction(
  _prev: GroupActionResult | null,
  formData: FormData,
): Promise<GroupActionResult> {
  try {
    const session = await requireGroupsWrite();
    const name = String(formData.get("name") || "").trim();
    const kind = String(formData.get("kind") || "Department") as MinistryGroupKind;
    const description = String(formData.get("description") || "").trim() || null;
    const branchId = String(formData.get("branchId") || "") || null;
    const linkLegacy = formData.get("linkLegacy") === "true";

    if (!name) return { ok: false, error: "Name is required." };

    const created = await createMinistryGroup({
      name,
      kind,
      description,
      branchId,
      actorId: session.user.id,
      linkLegacy,
    });

    revalidatePath("/groups");
    redirect(`/groups/${created.id}`);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    if (isRedirectError(error)) throw error;
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create group",
    };
  }
}

export async function ensureHubSyncedAction(_formData?: FormData) {
  await requireGroupsWrite();
  await syncLegacyGroupsToHub();
  revalidatePath("/groups");
  void _formData;
}

export async function addRosterAction(formData: FormData) {
  const session = await requireGroupsWrite();
  const groupId = String(formData.get("groupId") || "");
  const memberId = String(formData.get("memberId") || "");
  const roleNote = String(formData.get("roleNote") || "").trim() || null;
  if (!groupId || !memberId) return;

  await addRosterMember({
    groupId,
    memberId,
    roleNote,
    actorId: session.user.id,
  });
  revalidatePath(`/groups/${groupId}`);
}

export async function removeRosterAction(formData: FormData) {
  const session = await requireGroupsWrite();
  const entryId = String(formData.get("entryId") || "");
  const groupId = String(formData.get("groupId") || "");
  if (!entryId) return;

  await removeRosterMember({ entryId, actorId: session.user.id });
  if (groupId) revalidatePath(`/groups/${groupId}`);
}

export async function assignLeaderAction(
  _prev: GroupActionResult | null,
  formData: FormData,
): Promise<GroupActionResult> {
  try {
    const session = await requireGroupsWrite();
    const groupId = String(formData.get("groupId") || "");
    const memberId = String(formData.get("memberId") || "");
    const title = String(formData.get("title") || "").trim() || null;
    const notes = String(formData.get("notes") || "").trim() || null;
    if (!groupId || !memberId) {
      return { ok: false, error: "Group and member are required." };
    }

    await assignGroupLeader({
      groupId,
      memberId,
      title,
      notes,
      actorId: session.user.id,
    });
    revalidatePath(`/groups/${groupId}`);
    return { ok: true, message: "Leader assigned." };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to assign leader",
    };
  }
}

export async function endLeaderAction(formData: FormData) {
  const session = await requireGroupsWrite();
  const leaderId = String(formData.get("leaderId") || "");
  const groupId = String(formData.get("groupId") || "");
  if (!leaderId) return;
  await endGroupLeader({ leaderId, actorId: session.user.id });
  if (groupId) revalidatePath(`/groups/${groupId}`);
}

export async function createMeetingAction(
  _prev: GroupActionResult | null,
  formData: FormData,
): Promise<GroupActionResult> {
  try {
    const session = await requireGroupsWrite();
    const groupId = String(formData.get("groupId") || "");
    const title = String(formData.get("title") || "").trim();
    const heldAtRaw = String(formData.get("heldAt") || "");
    const notes = String(formData.get("notes") || "").trim() || null;
    const location = String(formData.get("location") || "").trim() || null;
    const countRaw = String(formData.get("attendanceCount") || "");
    if (!groupId || !title || !heldAtRaw) {
      return { ok: false, error: "Group, title, and date are required." };
    }

    await createMeetingLog({
      groupId,
      title,
      heldAt: new Date(`${heldAtRaw}T12:00:00.000Z`),
      notes,
      location,
      attendanceCount: countRaw ? Number(countRaw) : null,
      actorId: session.user.id,
    });
    revalidatePath(`/groups/${groupId}`);
    return { ok: true, message: "Meeting logged." };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to log meeting",
    };
  }
}

export async function announceGroupAction(
  _prev: GroupActionResult | null,
  formData: FormData,
): Promise<GroupActionResult> {
  try {
    const session = await requireGroupsWrite();
    const groupId = String(formData.get("groupId") || "");
    const title = String(formData.get("title") || "").trim();
    const body = String(formData.get("body") || "").trim();
    const channel = String(formData.get("channel") || "Email") as CommChannelKind;
    const fanOut = formData.get("fanOut") === "true";

    if (!groupId || !title || !body) {
      return { ok: false, error: "Title and message are required." };
    }

    const result = await postGroupAnnouncement({
      groupId,
      title,
      body,
      channel,
      actorId: session.user.id,
      fanOutToRoster: fanOut,
    });

    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/admin/communications");
    return {
      ok: true,
      message: fanOut
        ? `Announcement saved. ${result.outboxCount} stub outbox row(s) logged (no live send).`
        : "Announcement saved (in-app only).",
    };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to post announcement",
    };
  }
}

export async function syncRosterFromLegacyAction(formData: FormData) {
  const session = await requireGroupsWrite();
  const groupId = String(formData.get("groupId") || "");
  if (!groupId) return;
  await syncRosterFromLegacyMemberships(groupId);
  void session;
  revalidatePath(`/groups/${groupId}`);
}
