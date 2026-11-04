"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { HouseholdRelation, MemberStatus, Prisma } from "@prisma/client";
import { AuthGuardError, requireMembersWrite } from "@/lib/auth-guards";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  assertBranchWritable,
  assertMemberReadable,
} from "@/lib/members/access";
import {
  findDuplicateCandidates,
  persistDuplicateCandidates,
} from "@/lib/members/duplicates";
import { deleteMemberPhoto, saveMemberPhoto } from "@/lib/members/photos";
import { nextMemberNumber } from "@/lib/members/queries";
import {
  duplicateReviewSchema,
  memberBiodataSchema,
  memberStatusSchema,
  memberTransferSchema,
} from "@/lib/members/schemas";

export type ActionResult =
  | { ok: true; memberId?: string; warning?: string }
  | {
      ok: false;
      error: string;
      duplicates?: Array<{
        id: string;
        name: string;
        memberNumber: string | null;
        score: number;
        reasons: string[];
      }>;
    };

function parseDob(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formObject(formData: FormData) {
  const obj: Record<string, FormDataEntryValue | boolean> = {};
  for (const [key, value] of formData.entries()) {
    if (key === "forceCreate") {
      obj[key] = value === "true" || value === "on" || value === "1";
      continue;
    }
    if (value instanceof File) continue;
    obj[key] = value;
  }
  return obj;
}

async function syncGroups(
  tx: Prisma.TransactionClient,
  memberId: string,
  cellId: string | null,
  fellowshipMinistryId: string | null,
) {
  await tx.groupMembership.updateMany({
    where: { memberId, endedAt: null },
    data: { endedAt: new Date() },
  });

  if (cellId) {
    await tx.groupMembership.create({
      data: { memberId, kind: "Cell", cellId },
    });
  }
  if (fellowshipMinistryId) {
    await tx.groupMembership.create({
      data: {
        memberId,
        kind: "Fellowship",
        fellowshipMinistryId,
      },
    });
  }
}

async function syncHousehold(
  tx: Prisma.TransactionClient,
  memberId: string,
  householdName: string | null,
  relation: HouseholdRelation = "Head",
) {
  if (!householdName) return;

  const existingLink = await tx.householdMember.findFirst({
    where: { memberId },
    include: { household: true },
  });

  if (existingLink) {
    await tx.household.update({
      where: { id: existingLink.householdId },
      data: { name: householdName },
    });
    await tx.householdMember.update({
      where: { id: existingLink.id },
      data: { relation },
    });
    return;
  }

  const household = await tx.household.create({
    data: { name: householdName },
  });
  await tx.householdMember.create({
    data: {
      householdId: household.id,
      memberId,
      relation,
    },
  });
}

export async function registerMemberAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireMembersWrite();
    const parsed = memberBiodataSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const data = parsed.data;
    await assertBranchWritable(session.user, data.branchId);

    if (data.cellId) {
      const cell = await prisma.cell.findUnique({ where: { id: data.cellId } });
      if (!cell || cell.branchId !== data.branchId) {
        return { ok: false, error: "Selected cell does not belong to the branch." };
      }
    }

    const dob = parseDob(data.dateOfBirth);
    const duplicates = await findDuplicateCandidates({
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: dob,
      phone: data.phone,
      email: data.email,
    });

    if (duplicates.length > 0 && !data.forceCreate) {
      return {
        ok: false,
        error:
          "Possible duplicate member(s) found. Review matches or confirm force create.",
        duplicates: duplicates.map((d) => ({
          id: d.member.id,
          name: `${d.member.firstName} ${d.member.lastName}`,
          memberNumber: d.member.memberNumber,
          score: d.score,
          reasons: d.reasons,
        })),
      };
    }

    const branch = await prisma.branch.findUniqueOrThrow({
      where: { id: data.branchId },
    });
    const memberNumber = await nextMemberNumber(branch.code);

    const photo = formData.get("photo");
    let photoKey: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      photoKey = await saveMemberPhoto(photo);
    }

    const member = await prisma.$transaction(async (tx) => {
      const created = await tx.member.create({
        data: {
          memberNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          otherNames: data.otherNames,
          dateOfBirth: dob,
          gender: data.gender,
          phone: data.phone,
          email: data.email,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          region: data.region,
          country: data.country ?? branch.country,
          photoKey,
          status: "Active",
          branchId: data.branchId,
        },
      });

      await syncGroups(tx, created.id, data.cellId, data.fellowshipMinistryId);
      await syncHousehold(
        tx,
        created.id,
        data.householdName,
        (data.householdRelation as HouseholdRelation | undefined) ?? "Head",
      );

      await tx.memberStatusHistory.create({
        data: {
          memberId: created.id,
          fromStatus: null,
          toStatus: "Active",
          toBranchId: data.branchId,
          reason: "Initial registration",
          changedById: session.user.id,
        },
      });

      await writeAuditLog(
        {
          actorId: session.user.id,
          action: "member.create",
          entityType: "Member",
          entityId: created.id,
          metadata: {
            memberNumber,
            branchId: data.branchId,
            forcedDuplicate: Boolean(data.forceCreate && duplicates.length),
          },
        },
        tx,
      );

      return created;
    });

    if (duplicates.length > 0) {
      await persistDuplicateCandidates(member.id, duplicates);
    }

    revalidatePath("/members");
    redirect(`/members/${member.id}`);
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
    console.error(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to register member",
    };
  }
}

export async function updateMemberAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireMembersWrite();
    const memberId = String(formData.get("memberId") ?? "");
    if (!memberId) return { ok: false, error: "Member id required" };

    const existing = await assertMemberReadable(session.user, memberId);
    const parsed = memberBiodataSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const data = parsed.data;
    await assertBranchWritable(session.user, existing.branchId);

    // Branch moves go through transferMemberAction (writes status history).
    const branchId = existing.branchId;

    if (data.cellId) {
      const cell = await prisma.cell.findUnique({ where: { id: data.cellId } });
      if (!cell || cell.branchId !== branchId) {
        return { ok: false, error: "Selected cell does not belong to the branch." };
      }
    }

    const dob = parseDob(data.dateOfBirth);
    const photo = formData.get("photo");
    let newPhotoKey: string | undefined;
    if (photo instanceof File && photo.size > 0) {
      newPhotoKey = await saveMemberPhoto(photo);
    }

    await prisma.$transaction(async (tx) => {
      const before = await tx.member.findUniqueOrThrow({ where: { id: memberId } });
      if (newPhotoKey && before.photoKey) {
        await deleteMemberPhoto(before.photoKey);
      }

      await tx.member.update({
        where: { id: memberId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          otherNames: data.otherNames,
          dateOfBirth: dob,
          gender: data.gender,
          phone: data.phone,
          email: data.email,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          region: data.region,
          country: data.country,
          ...(newPhotoKey ? { photoKey: newPhotoKey } : {}),
        },
      });

      await syncGroups(tx, memberId, data.cellId, data.fellowshipMinistryId);
      await syncHousehold(
        tx,
        memberId,
        data.householdName,
        (data.householdRelation as HouseholdRelation | undefined) ?? "Head",
      );

      await writeAuditLog(
        {
          actorId: session.user.id,
          action: "member.update",
          entityType: "Member",
          entityId: memberId,
          metadata: { branchId },
        },
        tx,
      );
    });

    revalidatePath("/members");
    revalidatePath(`/members/${memberId}`);
    return { ok: true, memberId };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    console.error(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update member",
    };
  }
}

export async function changeMemberStatusAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireMembersWrite();
    const parsed = memberStatusSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const member = await assertMemberReadable(session.user, parsed.data.memberId);
    await assertBranchWritable(session.user, member.branchId);

    const current = await prisma.member.findUniqueOrThrow({
      where: { id: parsed.data.memberId },
    });

    if (current.status === parsed.data.toStatus) {
      return { ok: false, error: "Status is already set to that value." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: current.id },
        data: { status: parsed.data.toStatus as MemberStatus },
      });
      await tx.memberStatusHistory.create({
        data: {
          memberId: current.id,
          fromStatus: current.status,
          toStatus: parsed.data.toStatus as MemberStatus,
          fromBranchId: current.branchId,
          toBranchId: current.branchId,
          reason: parsed.data.reason,
          changedById: session.user.id,
        },
      });
      await writeAuditLog(
        {
          actorId: session.user.id,
          action: "member.status_change",
          entityType: "Member",
          entityId: current.id,
          metadata: {
            fromStatus: current.status,
            toStatus: parsed.data.toStatus,
            reason: parsed.data.reason,
          },
        },
        tx,
      );
    });

    revalidatePath(`/members/${current.id}`);
    revalidatePath("/members");
    return { ok: true, memberId: current.id };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Status change failed",
    };
  }
}

export async function transferMemberAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireMembersWrite();
    const parsed = memberTransferSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const member = await assertMemberReadable(session.user, parsed.data.memberId);
    await assertBranchWritable(session.user, member.branchId);

    if (member.branchId === parsed.data.toBranchId) {
      return { ok: false, error: "Member is already at that branch." };
    }

    const toBranch = await prisma.branch.findUnique({
      where: { id: parsed.data.toBranchId },
    });
    if (!toBranch) {
      return { ok: false, error: "Destination branch not found." };
    }

    // Branch Leaders may only transfer within their scoped branches unless Admin/Clerk.
    await assertBranchWritable(session.user, parsed.data.toBranchId);

    const current = await prisma.member.findUniqueOrThrow({
      where: { id: parsed.data.memberId },
      include: { branch: true },
    });

    await prisma.$transaction(async (tx) => {
      // End active cell memberships (cells are branch-local).
      await tx.groupMembership.updateMany({
        where: { memberId: current.id, kind: "Cell", endedAt: null },
        data: { endedAt: new Date() },
      });

      await tx.member.update({
        where: { id: current.id },
        data: {
          branchId: toBranch.id,
          status: "Active",
          country: toBranch.country,
        },
      });

      await tx.memberStatusHistory.create({
        data: {
          memberId: current.id,
          fromStatus: current.status,
          toStatus: "Transferred",
          fromBranchId: current.branchId,
          toBranchId: toBranch.id,
          reason:
            parsed.data.reason ??
            `Branch transfer ${current.branch.code} → ${toBranch.code}`,
          changedById: session.user.id,
        },
      });

      await tx.memberStatusHistory.create({
        data: {
          memberId: current.id,
          fromStatus: "Transferred",
          toStatus: "Active",
          fromBranchId: current.branchId,
          toBranchId: toBranch.id,
          reason: `Activated at ${toBranch.name}`,
          changedById: session.user.id,
        },
      });

      await writeAuditLog(
        {
          actorId: session.user.id,
          action: "member.branch_transfer",
          entityType: "Member",
          entityId: current.id,
          metadata: {
            fromBranchId: current.branchId,
            toBranchId: toBranch.id,
            fromCountry: current.branch.country,
            toCountry: toBranch.country,
            ghanaToInternational:
              !current.branch.isInternational && toBranch.isInternational,
          },
        },
        tx,
      );
    });

    revalidatePath(`/members/${current.id}`);
    revalidatePath("/members");
    return {
      ok: true,
      memberId: current.id,
      warning: `Transferred to ${toBranch.name} (${toBranch.country}).`,
    };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Transfer failed",
    };
  }
}

export async function reviewDuplicateAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireMembersWrite();
    const parsed = duplicateReviewSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const candidate = await prisma.duplicateCandidate.findUnique({
      where: { id: parsed.data.candidateId },
    });
    if (!candidate) return { ok: false, error: "Duplicate candidate not found" };

    await assertMemberReadable(session.user, candidate.memberAId);

    await prisma.duplicateCandidate.update({
      where: { id: candidate.id },
      data: { status: parsed.data.status },
    });

    await writeAuditLog({
      actorId: session.user.id,
      action: "member.duplicate_review",
      entityType: "DuplicateCandidate",
      entityId: candidate.id,
      metadata: { status: parsed.data.status },
    });

    revalidatePath("/members/duplicates");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Review failed",
    };
  }
}
