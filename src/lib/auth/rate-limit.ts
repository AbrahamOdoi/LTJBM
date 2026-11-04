import { prisma } from "@/lib/db";

/** Max failed attempts per email (or IP) inside the window before lockout. */
export const LOGIN_MAX_FAILURES = 8;
/** Sliding window for counting failures. */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
/** How long a lockout lasts after the threshold is hit. */
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; reason: string };

function windowStart(): Date {
  return new Date(Date.now() - LOGIN_WINDOW_MS);
}

/**
 * Check whether login may proceed for this email / IP.
 * Counts unsuccessful attempts in the sliding window.
 */
export async function checkLoginRateLimit(opts: {
  email: string;
  ipAddress?: string | null;
}): Promise<RateLimitResult> {
  const email = opts.email.toLowerCase().trim();
  const since = windowStart();

  const emailFails = await prisma.loginAttempt.count({
    where: { email, success: false, createdAt: { gte: since } },
  });
  if (emailFails >= LOGIN_MAX_FAILURES) {
    const oldest = await prisma.loginAttempt.findFirst({
      where: { email, success: false, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const unlockAt =
      (oldest?.createdAt.getTime() ?? Date.now()) + LOGIN_LOCKOUT_MS;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((unlockAt - Date.now()) / 1000),
    );
    return {
      allowed: false,
      retryAfterSeconds,
      reason: `Too many failed sign-in attempts. Try again in ${retryAfterSeconds}s.`,
    };
  }

  if (opts.ipAddress) {
    const ipFails = await prisma.loginAttempt.count({
      where: {
        ipAddress: opts.ipAddress,
        success: false,
        createdAt: { gte: since },
      },
    });
    if (ipFails >= LOGIN_MAX_FAILURES * 2) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(LOGIN_LOCKOUT_MS / 1000),
        reason: "Too many failed sign-in attempts from this network.",
      };
    }
  }

  return { allowed: true };
}

export async function recordLoginAttempt(opts: {
  email: string;
  ipAddress?: string | null;
  success: boolean;
}) {
  await prisma.loginAttempt.create({
    data: {
      email: opts.email.toLowerCase().trim(),
      ipAddress: opts.ipAddress ?? null,
      success: opts.success,
    },
  });

  // Opportunistic prune older than 24h (best-effort).
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.loginAttempt
    .deleteMany({ where: { createdAt: { lt: cutoff } } })
    .catch(() => undefined);
}
