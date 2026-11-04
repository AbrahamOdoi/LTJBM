import type { CommChannelKind, MessageTemplateKind } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

const DEFAULT_CHANNELS: Array<{
  kind: CommChannelKind;
  label: string;
  notes: string;
}> = [
  {
    kind: "Email",
    label: "Email (SMTP)",
    notes: "Set SMTP_* env vars for live send. Stub mode logs to MessageOutbox.",
  },
  {
    kind: "Sms",
    label: "SMS",
    notes: "Configure SMS_PROVIDER + API key in env. Disabled until credentials exist.",
  },
  {
    kind: "WhatsApp",
    label: "WhatsApp",
    notes: "Future Business API channel. Stub only.",
  },
  {
    kind: "Push",
    label: "Push notifications",
    notes: "Future mobile/web push. Stub only.",
  },
];

export async function ensureCommunicationChannels() {
  for (const ch of DEFAULT_CHANNELS) {
    await prisma.communicationChannel.upsert({
      where: { kind: ch.kind },
      create: {
        kind: ch.kind,
        label: ch.label,
        notes: ch.notes,
        isEnabled: false,
        configJson: {},
      },
      update: {},
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
  ];

  const existing = await prisma.messageTemplate.count();
  if (existing === 0) {
    await prisma.messageTemplate.createMany({ data: defaults });
  }
  return listMessageTemplates();
}

export async function setChannelEnabled(
  kind: CommChannelKind,
  isEnabled: boolean,
  actorId: string,
) {
  const channel = await prisma.communicationChannel.update({
    where: { kind },
    data: { isEnabled },
  });
  await writeAuditLog({
    actorId,
    action: "comms.channel_toggle",
    entityType: "CommunicationChannel",
    entityId: channel.id,
    metadata: { kind, isEnabled },
  });
  return channel;
}

/**
 * Stub send — always writes MessageOutbox with status "stubbed".
 * Live providers are Phase Later; never claims delivery succeeded.
 */
export async function stubSendMessage(input: {
  channel: CommChannelKind;
  templateKind?: MessageTemplateKind | null;
  toAddress: string;
  subject?: string | null;
  body: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}) {
  const channel = await prisma.communicationChannel.findUnique({
    where: { kind: input.channel },
  });

  const row = await prisma.messageOutbox.create({
    data: {
      channel: input.channel,
      templateKind: input.templateKind ?? null,
      toAddress: input.toAddress,
      subject: input.subject ?? null,
      body: input.body,
      status: channel?.isEnabled ? "queued_stub" : "stubbed_disabled",
      metadata: {
        ...(input.metadata ?? {}),
        note: "Would send when live provider is configured",
      },
    },
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "comms.stub_send",
    entityType: "MessageOutbox",
    entityId: row.id,
    metadata: { channel: input.channel, to: input.toAddress },
  });

  return row;
}

export async function listRecentOutbox(limit = 30) {
  return prisma.messageOutbox.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
