import type { ChannelAdapter, ProviderCredentialStatus, SendPayload, SendResult } from "./types";

function smsEnv() {
  const provider = (process.env.SMS_PROVIDER ?? "").trim().toLowerCase();
  return {
    provider: provider || "twilio",
    accountSid: process.env.TWILIO_ACCOUNT_SID?.trim() ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN?.trim() ?? "",
    from: process.env.TWILIO_FROM_NUMBER?.trim() ?? "",
    atApiKey: process.env.AFRICASTALKING_API_KEY?.trim() ?? "",
    atUsername: process.env.AFRICASTALKING_USERNAME?.trim() ?? "",
    atFrom: process.env.AFRICASTALKING_FROM?.trim() ?? "",
  };
}

export function isSmsConfigured(): boolean {
  const e = smsEnv();
  if (e.provider === "africastalking") {
    return Boolean(e.atApiKey && e.atUsername);
  }
  return Boolean(e.accountSid && e.authToken && e.from);
}

export const smsAdapter: ChannelAdapter = {
  channel: "Sms",
  status(): ProviderCredentialStatus {
    const configured = isSmsConfigured();
    const e = smsEnv();
    return {
      channel: "Sms",
      provider: e.provider,
      configured,
      reason: configured
        ? `SMS ready (${e.provider})`
        : "SMS credentials absent — set TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER (or SMS_PROVIDER=africastalking + AFRICASTALKING_*). Sends log as skipped_no_credentials.",
    };
  },
  async send(payload: SendPayload): Promise<SendResult> {
    if (!isSmsConfigured()) {
      console.warn(
        "[comms] SMS send skipped — credentials absent (Twilio or Africa's Talking).",
      );
      return {
        ok: false,
        skipped: true,
        provider: smsEnv().provider,
        detail:
          "SMS credentials absent — message left unsent. Configure Twilio or Africa's Talking env vars.",
      };
    }
    const e = smsEnv();
    if (e.provider === "africastalking") {
      return sendAfricasTalking(payload.to, payload.body, e);
    }
    return sendTwilio(payload.to, payload.body, e);
  },
};

async function sendTwilio(
  to: string,
  body: string,
  e: ReturnType<typeof smsEnv>,
): Promise<SendResult> {
  const auth = Buffer.from(`${e.accountSid}:${e.authToken}`).toString("base64");
  const form = new URLSearchParams({
    To: to,
    From: e.from,
    Body: body,
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
  const data = (await res.json()) as { sid?: string; message?: string; error_message?: string };
  if (!res.ok) {
    return {
      ok: false,
      skipped: false,
      provider: "twilio",
      detail: data.message || data.error_message || `http_${res.status}`,
    };
  }
  return {
    ok: true,
    skipped: false,
    provider: "twilio",
    providerMessageId: data.sid ?? null,
    detail: "sent",
  };
}

async function sendAfricasTalking(
  to: string,
  body: string,
  e: ReturnType<typeof smsEnv>,
): Promise<SendResult> {
  const form = new URLSearchParams({
    username: e.atUsername,
    to,
    message: body,
  });
  if (e.atFrom) form.set("from", e.atFrom);
  const res = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      apiKey: e.atApiKey,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      skipped: false,
      provider: "africastalking",
      detail: text.slice(0, 200) || `http_${res.status}`,
    };
  }
  return {
    ok: true,
    skipped: false,
    provider: "africastalking",
    providerMessageId: null,
    detail: "sent",
  };
}
