import { NextResponse } from "next/server";
import {
  AuthGuardError,
  requireAdmin,
} from "@/lib/auth-guards";
import { runCommsAutomations } from "@/lib/comms/automations";
import { processQueuedOutbox } from "@/lib/comms/service";
import {
  assertSameOriginMutation,
  getConfiguredCronSecret,
} from "@/lib/security";

/**
 * Run birthday automations + flush outbox.
 * Auth: Admin session or Bearer REPORT_CRON_SECRET.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = getConfiguredCronSecret();
    let actorId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      if (!cronSecret) {
        throw new AuthGuardError(
          "REPORT_CRON_SECRET is not configured (must be ≥16 chars, not a placeholder)",
          401,
        );
      }
      const token = authHeader.slice("Bearer ".length).trim();
      if (token !== cronSecret) {
        throw new AuthGuardError("Invalid cron secret", 401);
      }
    } else {
      assertSameOriginMutation(request);
      const session = await requireAdmin();
      actorId = session.user.id;
    }

    const automations = await runCommsAutomations(actorId);
    const flushed = await processQueuedOutbox(100);

    return NextResponse.json({
      ok: true,
      automations,
      flushed: flushed.length,
    });
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[api/comms/run]", error);
    return NextResponse.json({ error: "Comms run failed" }, { status: 500 });
  }
}
