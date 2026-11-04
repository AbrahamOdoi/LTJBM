/**
 * Demo / cron entrypoint for the monthly Board email.
 *
 * Usage:
 *   npm run report:monthly
 *
 * Env:
 *   REPORT_EMAIL_MODE=file|console|smtp   (default: file)
 *   REPORT_EMAIL_DIR=./tmp/board-reports
 *   SMTP_HOST / SMTP_FROM (when mode=smtp)
 *   DATABASE_URL=...
 */
import { sendMonthlyBoardReport } from "../src/lib/reporting/email";

async function main() {
  const delivery = await sendMonthlyBoardReport();
  console.log(JSON.stringify({ ok: true, delivery }, null, 2));
  if (delivery.artifactPath) {
    console.log(`Open artifact: ${delivery.artifactPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
