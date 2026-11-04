/**
 * Birthday automations + outbox flush.
 *
 * Usage:
 *   npm run comms:automations
 *
 * Cron/API alternative:
 *   POST /api/comms/run with Authorization: Bearer $REPORT_CRON_SECRET
 */
import { runCommsAutomations } from "../src/lib/comms/automations";
import { processQueuedOutbox } from "../src/lib/comms/service";

async function main() {
  const automations = await runCommsAutomations(null);
  const flushed = await processQueuedOutbox(100);
  console.log(
    JSON.stringify(
      {
        ok: true,
        automations,
        flushed: flushed.map((r) => ({ id: r.id, status: r.status })),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
