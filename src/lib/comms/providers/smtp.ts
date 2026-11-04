import nodemailer from "nodemailer";
import type { ChannelAdapter, ProviderCredentialStatus, SendPayload, SendResult } from "./types";

function smtpEnv() {
  return {
    host: process.env.SMTP_HOST?.trim() ?? "",
    port: Number(process.env.SMTP_PORT ?? "587"),
    user: process.env.SMTP_USER?.trim() ?? "",
    pass: process.env.SMTP_PASS?.trim() ?? "",
    from: process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || "",
    secure: (process.env.SMTP_SECURE ?? "").toLowerCase() === "true",
  };
}

export function isSmtpConfigured(): boolean {
  const e = smtpEnv();
  return Boolean(e.host && e.from);
}

export const smtpAdapter: ChannelAdapter = {
  channel: "Email",
  status(): ProviderCredentialStatus {
    const configured = isSmtpConfigured();
    return {
      channel: "Email",
      provider: "smtp",
      configured,
      reason: configured
        ? `SMTP ready (${smtpEnv().host})`
        : "SMTP credentials absent — set SMTP_HOST and SMTP_FROM (optional SMTP_USER/SMTP_PASS/SMTP_PORT). Sends log as skipped_no_credentials.",
    };
  },
  async send(payload: SendPayload): Promise<SendResult> {
    if (!isSmtpConfigured()) {
      console.warn(
        "[comms] Email send skipped — SMTP credentials absent (SMTP_HOST / SMTP_FROM).",
      );
      return {
        ok: false,
        skipped: true,
        provider: "smtp",
        detail:
          "SMTP credentials absent — message left unsent. Set SMTP_HOST and SMTP_FROM to enable live email.",
      };
    }
    const e = smtpEnv();
    const transport = nodemailer.createTransport({
      host: e.host,
      port: e.port,
      secure: e.secure,
      auth: e.user ? { user: e.user, pass: e.pass } : undefined,
    });
    const info = await transport.sendMail({
      from: e.from,
      to: payload.to,
      subject: payload.subject || "Living Testimonies (LTJBM)",
      text: payload.body,
      html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(payload.body)}</pre>`,
    });
    return {
      ok: true,
      skipped: false,
      provider: "smtp",
      providerMessageId: info.messageId ?? null,
      detail: "sent",
    };
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Send arbitrary HTML (Board reports). */
export async function sendSmtpHtml(opts: {
  to: string[];
  subject: string;
  html: string;
}): Promise<SendResult> {
  if (!isSmtpConfigured()) {
    console.warn(
      "[comms] Board report SMTP skipped — SMTP credentials absent.",
    );
    return {
      ok: false,
      skipped: true,
      provider: "smtp",
      detail:
        "SMTP credentials absent — Board report not emailed. Set SMTP_HOST and SMTP_FROM (or use REPORT_EMAIL_MODE=file).",
    };
  }
  const e = smtpEnv();
  const transport = nodemailer.createTransport({
    host: e.host,
    port: e.port,
    secure: e.secure,
    auth: e.user ? { user: e.user, pass: e.pass } : undefined,
  });
  const info = await transport.sendMail({
    from: e.from,
    to: opts.to.join(", "),
    subject: opts.subject,
    html: opts.html,
  });
  return {
    ok: true,
    skipped: false,
    provider: "smtp",
    providerMessageId: info.messageId ?? null,
    detail: "sent",
  };
}
