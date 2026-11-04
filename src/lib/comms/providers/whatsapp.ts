import type { ChannelAdapter, ProviderCredentialStatus, SendPayload, SendResult } from "./types";

/**
 * WhatsApp adapter — Twilio Content API style when credentials present;
 * otherwise disabled stub (never claims delivery).
 */
function waEnv() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID?.trim() ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN?.trim() ?? "",
    from: process.env.TWILIO_WHATSAPP_FROM?.trim() ?? "",
  };
}

export function isWhatsAppConfigured(): boolean {
  const e = waEnv();
  return Boolean(e.accountSid && e.authToken && e.from);
}

export const whatsappAdapter: ChannelAdapter = {
  channel: "WhatsApp",
  status(): ProviderCredentialStatus {
    const configured = isWhatsAppConfigured();
    return {
      channel: "WhatsApp",
      provider: "twilio-whatsapp",
      configured,
      reason: configured
        ? "WhatsApp ready (Twilio)"
        : "WhatsApp stub — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (e.g. whatsapp:+14155238886). No secrets stored in repo.",
    };
  },
  async send(payload: SendPayload): Promise<SendResult> {
    if (!isWhatsAppConfigured()) {
      console.warn(
        "[comms] WhatsApp send skipped — credentials absent (adapter stub).",
      );
      return {
        ok: false,
        skipped: true,
        provider: "twilio-whatsapp",
        detail:
          "WhatsApp credentials absent — stub only. Set TWILIO_WHATSAPP_FROM with Twilio sandbox/production sender.",
      };
    }
    const e = waEnv();
    const to = payload.to.startsWith("whatsapp:")
      ? payload.to
      : `whatsapp:${payload.to}`;
    const auth = Buffer.from(`${e.accountSid}:${e.authToken}`).toString("base64");
    const form = new URLSearchParams({
      To: to,
      From: e.from.startsWith("whatsapp:") ? e.from : `whatsapp:${e.from}`,
      Body: payload.body,
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${e.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );
    const data = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) {
      return {
        ok: false,
        skipped: false,
        provider: "twilio-whatsapp",
        detail: data.message || `http_${res.status}`,
      };
    }
    return {
      ok: true,
      skipped: false,
      provider: "twilio-whatsapp",
      providerMessageId: data.sid ?? null,
      detail: "sent",
    };
  },
};
