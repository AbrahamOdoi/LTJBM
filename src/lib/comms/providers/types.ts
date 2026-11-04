import type { CommChannelKind } from "@prisma/client";

export type ProviderCredentialStatus = {
  channel: CommChannelKind;
  provider: string;
  configured: boolean;
  reason: string;
};

export type SendPayload = {
  to: string;
  subject?: string | null;
  body: string;
  metadata?: Record<string, unknown>;
};

export type SendResult = {
  ok: boolean;
  skipped: boolean;
  provider: string;
  providerMessageId?: string | null;
  detail: string;
};

export interface ChannelAdapter {
  channel: CommChannelKind;
  status(): ProviderCredentialStatus;
  send(payload: SendPayload): Promise<SendResult>;
}
