/**
 * Edge-safe security helpers (no Prisma / Auth.js Node imports).
 * Used by middleware auth.config and by API route guards.
 */

const WEAK_CRON_SECRETS = new Set([
  "",
  "replace-with-cron-secret",
  "changeme",
  "secret",
]);

export class SecurityGuardError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "SecurityGuardError";
    this.status = status;
  }
}

/** True when REPORT_CRON_SECRET is set to a non-placeholder value. */
export function isCronSecretConfigured(): boolean {
  const secret = process.env.REPORT_CRON_SECRET?.trim() ?? "";
  return secret.length >= 16 && !WEAK_CRON_SECRETS.has(secret.toLowerCase());
}

export function getConfiguredCronSecret(): string | null {
  if (!isCronSecretConfigured()) return null;
  return process.env.REPORT_CRON_SECRET!.trim();
}

/**
 * Defense-in-depth for browser-originated mutating API calls.
 * Allows non-browser callers that present a Bearer token (cron).
 */
export function assertSameOriginMutation(request: Request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return;
  }

  if (request.headers.get("authorization")?.startsWith("Bearer ")) {
    return;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return;
  }

  let allowedOrigin: string | null = null;
  const authUrl = process.env.AUTH_URL?.trim();
  if (authUrl) {
    try {
      allowedOrigin = new URL(authUrl).origin;
    } catch {
      allowedOrigin = null;
    }
  }

  if (!allowedOrigin) {
    const host = request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    if (host) {
      allowedOrigin = `${proto}://${host}`;
    }
  }

  if (allowedOrigin && origin !== allowedOrigin) {
    throw new SecurityGuardError("Cross-origin request blocked", 403);
  }
}
