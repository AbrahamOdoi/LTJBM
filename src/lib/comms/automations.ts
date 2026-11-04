import type { CommChannelKind } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import {
  enqueueAndSend,
  ensureCommunicationChannels,
  ensureDefaultTemplates,
  renderTemplate,
} from "@/lib/comms/service";
import { prisma } from "@/lib/db";
import { toMoneyNumber } from "@/lib/finance/money";

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Queue birthday blessings for members whose DOB month/day matches today (UTC).
 * Uses outbox — logs clearly when credentials absent.
 */
export async function runBirthdayAutomations(actorId?: string | null) {
  await ensureCommunicationChannels();
  await ensureDefaultTemplates();

  const template = await prisma.messageTemplate.findFirst({
    where: { kind: "Birthday", isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!template) {
    console.warn("[comms] Birthday automation — no active template.");
    return { sent: 0, skipped: 0, reason: "no_template" };
  }

  const today = new Date();
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();

  // Postgres extract for month/day
  const members = await prisma.$queryRaw<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    }>
  >`
    SELECT id, "firstName", "lastName", email, phone
    FROM "Member"
    WHERE "dateOfBirth" IS NOT NULL
      AND EXTRACT(MONTH FROM "dateOfBirth") = ${month}
      AND EXTRACT(DAY FROM "dateOfBirth") = ${day}
      AND status IN ('Active', 'Visitor')
  `;

  const dayKey = startOfUtcDay().toISOString().slice(0, 10);
  let sent = 0;
  let skipped = 0;

  for (const m of members) {
    const channel: CommChannelKind =
      template.channel === "Sms" && m.phone
        ? "Sms"
        : m.email
          ? "Email"
          : m.phone
            ? "Sms"
            : "Email";
    const to =
      channel === "Email" ? m.email?.trim() : m.phone?.trim();
    if (!to) {
      skipped += 1;
      continue;
    }

    // Dedupe: one birthday message per address per day
    const existing = await prisma.messageOutbox.findFirst({
      where: {
        templateKind: "Birthday",
        toAddress: to,
        createdAt: { gte: startOfUtcDay() },
      },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const body = renderTemplate(template.body, {
      firstName: m.firstName,
      lastName: m.lastName,
    });
    const subject = template.subject
      ? renderTemplate(template.subject, { firstName: m.firstName })
      : null;

    const row = await enqueueAndSend({
      channel,
      templateKind: "Birthday",
      toAddress: to,
      subject,
      body,
      actorId,
      forceAttempt: true,
      metadata: {
        automation: "birthday",
        memberId: m.id,
        dayKey,
      },
    });
    if (row.status === "sent") sent += 1;
    else skipped += 1;
  }

  await writeAuditLog({
    actorId,
    action: "comms.automation.birthday",
    entityType: "MessageOutbox",
    entityId: null,
    metadata: { candidates: members.length, sent, skipped, dayKey },
  });

  console.log(
    `[comms] Birthday automation day=${dayKey} candidates=${members.length} sent_or_queued=${sent} skipped=${skipped}`,
  );

  return { candidates: members.length, sent, skipped, dayKey };
}

/**
 * Welcome message when a visitor is recorded / follow-up opened.
 */
export async function enqueueWelcomeForMember(
  memberId: string,
  actorId?: string | null,
) {
  await ensureCommunicationChannels();
  await ensureDefaultTemplates();

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
    },
  });
  if (!member) return null;

  const template = await prisma.messageTemplate.findFirst({
    where: { kind: "Welcome", isActive: true },
  });
  if (!template) {
    console.warn("[comms] Welcome automation — no active template.");
    return null;
  }

  const channel: CommChannelKind =
    template.channel === "Sms" && member.phone
      ? "Sms"
      : member.email
        ? "Email"
        : member.phone
          ? "Sms"
          : "Email";
  const to =
    channel === "Email" ? member.email?.trim() : member.phone?.trim();
  if (!to) {
    console.warn(
      `[comms] Welcome skipped for member ${memberId} — no email/phone.`,
    );
    return null;
  }

  return enqueueAndSend({
    channel,
    templateKind: "Welcome",
    toAddress: to,
    subject: template.subject
      ? renderTemplate(template.subject, { firstName: member.firstName })
      : null,
    body: renderTemplate(template.body, {
      firstName: member.firstName,
      lastName: member.lastName,
    }),
    actorId,
    forceAttempt: true,
    metadata: { automation: "welcome", memberId },
  });
}

/**
 * Contribution receipt after HQ payment post (manual or online giving).
 * Never includes Board-facing named lists — one-to-one to the giver only.
 */
export async function enqueueReceiptForPayment(
  paymentId: string,
  actorId?: string | null,
) {
  await ensureCommunicationChannels();
  await ensureDefaultTemplates();

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      obligation: {
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          obligationType: true,
        },
      },
    },
  });
  if (!payment) return null;

  const member = payment.obligation.member;
  const template = await prisma.messageTemplate.findFirst({
    where: { kind: "Receipt", isActive: true },
  });
  if (!template) {
    console.warn("[comms] Receipt automation — no active template.");
    return null;
  }

  const channel: CommChannelKind =
    template.channel === "Sms" && member.phone
      ? "Sms"
      : member.email
        ? "Email"
        : member.phone
          ? "Sms"
          : "Email";
  const to =
    channel === "Email" ? member.email?.trim() : member.phone?.trim();
  if (!to) {
    console.warn(
      `[comms] Receipt skipped for payment ${paymentId} — member has no email/phone.`,
    );
    return null;
  }

  const amount = toMoneyNumber(payment.amount).toFixed(2);
  const paidAt = payment.paidAt.toISOString().slice(0, 10);
  const kind = payment.obligation.obligationType.name;

  return enqueueAndSend({
    channel,
    templateKind: "Receipt",
    toAddress: to,
    subject: template.subject
      ? renderTemplate(template.subject, {
          firstName: member.firstName,
          amount,
          kind,
        })
      : null,
    body: renderTemplate(template.body, {
      firstName: member.firstName,
      lastName: member.lastName,
      amount,
      paidAt,
      kind,
    }),
    actorId,
    forceAttempt: true,
    metadata: {
      automation: "receipt",
      paymentId,
      memberId: member.id,
      // Board aggregates never receive this — one recipient only
    },
  });
}

export async function runCommsAutomations(actorId?: string | null) {
  const birthday = await runBirthdayAutomations(actorId);
  return { birthday };
}
