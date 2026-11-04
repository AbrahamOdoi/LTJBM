import type { CommChannelKind } from "@prisma/client";
import { smsAdapter } from "./sms";
import { smtpAdapter } from "./smtp";
import { whatsappAdapter } from "./whatsapp";
import type { ChannelAdapter, ProviderCredentialStatus, SendPayload, SendResult } from "./types";

const pushAdapter: ChannelAdapter = {
  channel: "Push",
  status() {
    return {
      channel: "Push",
      provider: "stub",
      configured: false,
      reason: "Push notifications not configured — stub only for this release.",
    };
  },
  async send(): Promise<SendResult> {
    console.warn("[comms] Push send skipped — stub only.");
    return {
      ok: false,
      skipped: true,
      provider: "stub",
      detail: "Push adapter stub — no credentials path in this release.",
    };
  },
};

const adapters: Record<CommChannelKind, ChannelAdapter> = {
  Email: smtpAdapter,
  Sms: smsAdapter,
  WhatsApp: whatsappAdapter,
  Push: pushAdapter,
};

export function getAdapter(channel: CommChannelKind): ChannelAdapter {
  return adapters[channel];
}

export function listProviderStatuses(): ProviderCredentialStatus[] {
  return (Object.keys(adapters) as CommChannelKind[]).map((k) =>
    adapters[k].status(),
  );
}

export async function deliverViaProvider(
  channel: CommChannelKind,
  payload: SendPayload,
): Promise<SendResult> {
  return getAdapter(channel).send(payload);
}

export type { ProviderCredentialStatus, SendPayload, SendResult };
export { isSmtpConfigured } from "./smtp";
export { sendSmtpHtml } from "./smtp";
export { isSmsConfigured } from "./sms";
export { isWhatsAppConfigured } from "./whatsapp";
