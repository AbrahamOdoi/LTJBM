"use server";

import { revalidatePath } from "next/cache";
import type { FollowUpStatus, MilestoneKind, Prisma } from "@prisma/client";
import { AuthGuardError, requireMembersWrite } from "@/lib/auth-guards";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { assertMemberReadable } from "@/lib/members/access";

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function updateMemberEnrichmentAction(formData: FormData) {
  const session = await requireMembersWrite();
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) throw new AuthGuardError("Member id required", 400);

  await assertMemberReadable(session.user, memberId);

  const joinedAt = parseDate(String(formData.get("joinedAt") || "") || null);
  const baptismDate = parseDate(
    String(formData.get("baptismDate") || "") || null,
  );
  const confirmationDate = parseDate(
    String(formData.get("confirmationDate") || "") || null,
  );
  const initialStatus = String(formData.get("registerAs") || "");

  await prisma.$transaction(async (tx) => {
    const data: Prisma.MemberUpdateInput = {
      joinedAt,
      baptismDate,
      confirmationDate,
    };
    if (initialStatus === "Visitor") {
      data.status = "Visitor";
    }
    await tx.member.update({ where: { id: memberId }, data });
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "member.enrichment_update",
        entityType: "Member",
        entityId: memberId,
        metadata: { joinedAt, baptismDate, confirmationDate },
      },
      tx,
    );
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
}

export async function addMemberTagAction(formData: FormData) {
  const session = await requireMembersWrite();
  const memberId = String(formData.get("memberId") ?? "");
  const tagName = String(formData.get("tagName") ?? "").trim();
  if (!memberId || !tagName) return;

  await assertMemberReadable(session.user, memberId);

  const tag = await prisma.tag.upsert({
    where: { name: tagName },
    create: { name: tagName },
    update: {},
  });

  await prisma.memberTag.upsert({
    where: { memberId_tagId: { memberId, tagId: tag.id } },
    create: { memberId, tagId: tag.id },
    update: {},
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "member.tag_add",
    entityType: "Member",
    entityId: memberId,
    metadata: { tag: tagName },
  });

  revalidatePath(`/members/${memberId}`);
}

export async function removeMemberTagAction(formData: FormData) {
  const session = await requireMembersWrite();
  const memberId = String(formData.get("memberId") ?? "");
  const tagId = String(formData.get("tagId") ?? "");
  if (!memberId || !tagId) return;

  await assertMemberReadable(session.user, memberId);
  await prisma.memberTag.deleteMany({ where: { memberId, tagId } });
  revalidatePath(`/members/${memberId}`);
}

export async function addMilestoneAction(formData: FormData) {
  const session = await requireMembersWrite();
  const memberId = String(formData.get("memberId") ?? "");
  const kind = String(formData.get("kind") ?? "") as MilestoneKind;
  const occurredOn = parseDate(String(formData.get("occurredOn") || "") || null);
  const title = String(formData.get("title") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!memberId || !kind || !occurredOn) return;
  await assertMemberReadable(session.user, memberId);

  await prisma.memberMilestone.create({
    data: { memberId, kind, occurredOn, title, notes },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "member.milestone_add",
    entityType: "Member",
    entityId: memberId,
    metadata: { kind },
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members/milestones");
}

export async function createFollowUpAction(formData: FormData) {
  const session = await requireMembersWrite();
  const memberId = String(formData.get("memberId") ?? "");
  const notes = String(formData.get("notes") || "").trim() || null;
  const firstVisitOn = parseDate(
    String(formData.get("firstVisitOn") || "") || null,
  );
  const nextActionOn = parseDate(
    String(formData.get("nextActionOn") || "") || null,
  );

  if (!memberId) return;
  await assertMemberReadable(session.user, memberId);
  const current = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
    select: { status: true },
  });

  await prisma.$transaction(async (tx) => {
    if (current.status !== "Visitor") {
      await tx.member.update({
        where: { id: memberId },
        data: { status: "Visitor" },
      });
      await tx.memberStatusHistory.create({
        data: {
          memberId,
          fromStatus: current.status,
          toStatus: "Visitor",
          reason: "Opened visitor follow-up",
          changedById: session.user.id,
        },
      });
    }
    await tx.visitorFollowUp.create({
      data: {
        memberId,
        notes,
        firstVisitOn: firstVisitOn ?? new Date(),
        nextActionOn,
        createdById: session.user.id,
        assignedToId: session.user.id,
      },
    });
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "followup.create",
        entityType: "VisitorFollowUp",
        entityId: memberId,
      },
      tx,
    );
  });

  try {
    const { enqueueWelcomeForMember } = await import("@/lib/comms/automations");
    await enqueueWelcomeForMember(memberId, session.user.id);
  } catch (err) {
    console.warn("[members] welcome automation failed:", err);
  }

  revalidatePath("/members/follow-ups");
  revalidatePath(`/members/${memberId}`);
}

export async function updateFollowUpAction(formData: FormData) {
  const session = await requireMembersWrite();
  const id = String(formData.get("followUpId") ?? "");
  const status = String(formData.get("status") ?? "") as FollowUpStatus;
  const notes = String(formData.get("notes") || "").trim() || null;
  const nextActionOn = parseDate(
    String(formData.get("nextActionOn") || "") || null,
  );
  if (!id || !status) return;

  const existing = await prisma.visitorFollowUp.findUnique({ where: { id } });
  if (!existing) return;
  await assertMemberReadable(session.user, existing.memberId);

  await prisma.visitorFollowUp.update({
    where: { id },
    data: {
      status,
      notes,
      nextActionOn,
      completedAt:
        status === "Completed" || status === "Cancelled" ? new Date() : null,
    },
  });

  revalidatePath("/members/follow-ups");
  revalidatePath(`/members/${existing.memberId}`);
}

export async function listOpenFollowUps() {
  return prisma.visitorFollowUp.findMany({
    where: { status: { in: ["Open", "InProgress"] } },
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          memberNumber: true,
          phone: true,
          branch: { select: { name: true } },
        },
      },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [{ nextActionOn: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function listUpcomingMilestones(days = 30) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days);

  // Milestones with explicit dates in window + birthdays by month/day proxy via DOB
  const milestones = await prisma.memberMilestone.findMany({
    where: { occurredOn: { gte: start, lte: end } },
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          memberNumber: true,
        },
      },
    },
    orderBy: { occurredOn: "asc" },
    take: 50,
  });

  const membersWithDob = await prisma.member.findMany({
    where: { dateOfBirth: { not: null }, status: { in: ["Active", "Visitor"] } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      memberNumber: true,
      dateOfBirth: true,
    },
    take: 500,
  });

  const birthdays = membersWithDob
    .map((m) => {
      if (!m.dateOfBirth) return null;
      const month = m.dateOfBirth.getUTCMonth();
      const day = m.dateOfBirth.getUTCDate();
      const thisYear = new Date(
        Date.UTC(start.getUTCFullYear(), month, day),
      );
      let next = thisYear;
      if (next < start) {
        next = new Date(Date.UTC(start.getUTCFullYear() + 1, month, day));
      }
      if (next > end) return null;
      return { member: m, next };
    })
    .filter(Boolean)
    .slice(0, 40);

  return { milestones, birthdays };
}
