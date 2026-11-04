import type { CommChannelKind, MessageTemplateKind } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { deliverViaProvider, listProviderStatuses } from "@/lib/comms/providers";
import {
  countMembersForSegment,
  listMembersForSegment,
  type MemberSegmentFilter,
} from "@/lib/comms/segments";
import { prisma } from "@/lib/db";

const DEFAULT_CHANNELS: Array<{
  kind: CommChannelKind;
  label: string;
  notes: string;
}> = [
  {
    kind: "Email",
    label: "Email (SMTP)",
    notes: "Set SMTP_HOST + SMTP_FROM for live send. Without credentials, outbox logs skipped_no_credentials.",
  },
  {
    kind: "Sms",
    label: "SMS",
    notes: "Twilio (TWILIO_*) or Africa's Talking (SMS_PROVIDER=africastalking). Disabled until credentials exist.",
  },
  {
    kind: "WhatsApp",
    label: "WhatsApp",
    notes: "Twilio WhatsApp when TWILIO_WHATSAPP_FROM is set; otherwise adapter stub.",
  },
  {
    kind: "Push",
    label: "Push notifications",
    notes: "Stub only in this release.",
  },
];

export async function ensureCommunicationChannels() {
  const statuses = listProviderStatuses();
  for (const ch of DEFAULT_CHANNELS) {
    const status = statuses.find((s) => s.channel === ch.kind);
    await prisma.communicationChannel.upsert({
      where: { kind: ch.kind },
      create: {
        kind: ch.kind,
        label: ch.label,
        notes: status?.reason ?? ch.notes,
        isEnabled: false,
        configJson: {
          provider: status?.provider,
          configured: status?.configured ?? false,
        },
      },
      update: {
        notes: status?.reason ?? ch.notes,
        configJson: {
          provider: status?.provider,
          configured: status?.configured ?? false,
        },
      },
    });
  }
  return prisma.communicationChannel.findMany({ orderBy: { kind: "asc" } });
}

export async function listMessageTemplates() {
  return prisma.messageTemplate.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
}

export async function ensureDefaultTemplates() {
  const defaults: Array<{
    kind: MessageTemplateKind;
    name: string;
    subject: string;
    body: string;
    channel: CommChannelKind;
  }> = [
    {
      kind: "Birthday",
      name: "Birthday blessing",
      subject: "Happy birthday from LTJBM",
      body: "Dear {{firstName}}, the Living Testimonies family celebrates you today. May the Lord bless your new year of life.",
      channel: "Email",
    },
    {
      kind: "Welcome",
      name: "Visitor welcome",
      subject: "Welcome to LTJBM",
      body: "Dear {{firstName}}, thank you for worshipping with us. We would love to walk with you — a leader will follow up soon.",
      channel: "Email",
    },
    {
      kind: "Receipt",
      name: "Contribution receipt",
      subject: "Your contribution receipt",
      body: "Dear {{firstName}}, we received GH₵{{amount}} on {{paidAt}} ({{kind}}). Thank you for your faithfulness.",
      channel: "Email",
    },
    {
      kind: "GroupAnnounce",
      name: "Group announcement",
      subject: "Message from your LTJBM group",
      body: "{{body}}",
      channel: "Email",
    },
  ];

  const existing = await prisma.messageTemplate.count();
  if (existing === 0) {
    await prisma.messageTemplate.createMany({ data: defaults });
  }
  return listMessageTemplates();
}

export function renderTemplate(
  body: string,
  vars: Record<string, string | number | null | undefined>,
) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}

export async function setChannelEnabled(
  kind: CommChannelKind,
  isEnabled: boolean,
  actorId: string,
) {
  const status = listProviderStatuses().find((s) => s.channel === kind);
  // Enabling without credentials is allowed for queueing, but live send still skips.
  const channel = await prisma.communicationChannel.update({
    where: { kind },
    data: {
      isEnabled,
      notes: status?.reason,
      configJson: {
        provider: status?.provider,
        configured: status?.configured ?? false,
      },
    },
  });
  await writeAuditLog({
    actorId,
    action: "comms.channel_toggle",
    entityType: "CommunicationChannel",
    entityId: channel.id,
    metadata: {
      kind,
      isEnabled,
      providerConfigured: status?.configured ?? false,
    },
  });
  return channel;
}

/**
 * Enqueue a message and attempt live delivery when credentials + channel enabled.
 * Always writes MessageOutbox with a clear status.
 */
export async function enqueueAndSend(input: {
  channel: CommChannelKind;
  templateKind?: MessageTemplateKind | null;
  toAddress: string;
  subject?: string | null;
  body: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
  /** When true, attempt send even if channel toggle is off (automations). */
  forceAttempt?: boolean;
}) {
  const channel = await prisma.communicationChannel.findUnique({
    where: { kind: input.channel },
  });
  const provider = listProviderStatuses().find((s) => s.channel === input.channel);
  const enabled = channel?.isEnabled || input.forceAttempt;

  if (!enabled) {
    const row = await prisma.messageOutbox.create({
      data: {
        channel: input.channel,
        templateKind: input.templateKind ?? null,
        toAddress: input.toAddress,
        subject: input.subject ?? null,
        body: input.body,
        status: "stubbed_disabled",
        metadata: {
          ...(input.metadata ?? {}),
          note: "Channel disabled — enable in Communications to queue live sends.",
          providerConfigured: provider?.configured ?? false,
        },
      },
    });
    await writeAuditLog({
      actorId: input.actorId,
      action: "comms.outbox.disabled",
      entityType: "MessageOutbox",
      entityId: row.id,
      metadata: { channel: input.channel, to: input.toAddress },
    });
    return row;
  }

  const queued = await prisma.messageOutbox.create({
    data: {
      channel: input.channel,
      templateKind: input.templateKind ?? null,
      toAddress: input.toAddress,
      subject: input.subject ?? null,
      body: input.body,
      status: "queued",
      metadata: {
        ...(input.metadata ?? {}),
        providerConfigured: provider?.configured ?? false,
      },
    },
  });

  const result = await deliverViaProvider(input.channel, {
    to: input.toAddress,
    subject: input.subject,
    body: input.body,
    metadata: input.metadata,
  });

  let status: string;
  if (result.skipped) {
    status = "skipped_no_credentials";
    console.warn(
      `[comms] Outbox ${queued.id} skipped — credentials absent for ${input.channel}: ${result.detail}`,
    );
  } else if (result.ok) {
    status = "sent";
  } else {
    status = "failed";
  }

  const updated = await prisma.messageOutbox.update({
    where: { id: queued.id },
    data: {
      status,
      sentAt: result.ok ? new Date() : null,
      error: result.ok ? null : result.detail,
      metadata: {
        ...(input.metadata ?? {}),
        provider: result.provider,
        providerMessageId: result.providerMessageId ?? null,
        detail: result.detail,
      },
    },
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: result.ok
      ? "comms.outbox.sent"
      : result.skipped
        ? "comms.outbox.skipped_no_credentials"
        : "comms.outbox.failed",
    entityType: "MessageOutbox",
    entityId: updated.id,
    metadata: {
      channel: input.channel,
      to: input.toAddress,
      status,
      detail: result.detail,
    },
  });

  return updated;
}

/** @deprecated Use enqueueAndSend — kept for callers expecting stub name. */
export async function stubSendMessage(input: {
  channel: CommChannelKind;
  templateKind?: MessageTemplateKind | null;
  toAddress: string;
  subject?: string | null;
  body: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}) {
  return enqueueAndSend(input);
}

export async function sendSegmentedBroadcast(input: {
  channel: CommChannelKind;
  subject?: string | null;
  body: string;
  templateKind?: MessageTemplateKind | null;
  filter: MemberSegmentFilter;
  actorId: string;
}) {
  const requireEmail = input.channel === "Email";
  const requirePhone =
    input.channel === "Sms" || input.channel === "WhatsApp";
  const members = await listMembersForSegment({
    ...input.filter,
    requireEmail,
    requirePhone,
  });
  const matchCount = await countMembersForSegment({
    ...input.filter,
    requireEmail,
    requirePhone,
  });

  const results = [];
  for (const m of members) {
    const to =
      input.channel === "Email" ? m.email?.trim() : m.phone?.trim();
    if (!to) continue;
    const body = renderTemplate(input.body, {
      firstName: m.firstName,
      lastName: m.lastName,
      memberNumber: m.memberNumber,
    });
    const subject = input.subject
      ? renderTemplate(input.subject, {
          firstName: m.firstName,
          lastName: m.lastName,
        })
      : null;
    const row = await enqueueAndSend({
      channel: input.channel,
      templateKind: input.templateKind ?? "Custom",
      toAddress: to,
      subject,
      body,
      actorId: input.actorId,
      metadata: { memberId: m.id, segment: true },
    });
    results.push(row);
  }

  await writeAuditLog({
    actorId: input.actorId,
    action: "comms.segment.send",
    entityType: "MessageOutbox",
    entityId: null,
    metadata: {
      channel: input.channel,
      matched: matchCount,
      enqueued: results.length,
      filter: input.filter,
    },
  });

  return { matched: matchCount, enqueued: results.length, results };
}

export async function processQueuedOutbox(limit = 50) {
  const rows = await prisma.messageOutbox.findMany({
    where: { status: { in: ["queued", "skipped_no_credentials"] } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  const processed = [];
  for (const row of rows) {
    const channel = await prisma.communicationChannel.findUnique({
      where: { kind: row.channel },
    });
    if (!channel?.isEnabled) {
      processed.push(row);
      continue;
    }
    const result = await deliverViaProvider(row.channel, {
      to: row.toAddress,
      subject: row.subject,
      body: row.body,
    });
    let status: string;
    if (result.skipped) status = "skipped_no_credentials";
    else if (result.ok) status = "sent";
    else status = "failed";

    if (result.skipped) {
      console.warn(
        `[comms] Reprocess ${row.id} still skipped — credentials absent: ${result.detail}`,
      );
    }

    const updated = await prisma.messageOutbox.update({
      where: { id: row.id },
      data: {
        status,
        sentAt: result.ok ? new Date() : null,
        error: result.ok ? null : result.detail,
        metadata: {
          ...((row.metadata as object) ?? {}),
          provider: result.provider,
          providerMessageId: result.providerMessageId ?? null,
          detail: result.detail,
          reprocessedAt: new Date().toISOString(),
        },
      },
    });
    processed.push(updated);
  }
  return processed;
}

export async function listRecentOutbox(limit = 30) {
  return prisma.messageOutbox.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export { listProviderStatuses };
