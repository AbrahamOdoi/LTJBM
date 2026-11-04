import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatGhs } from "@/lib/finance/money";
import type { DashboardSnapshot } from "@/lib/reporting/aggregates";
import {
  ensureDefaultBoardTemplate,
  markScheduleRan,
} from "@/lib/reporting/service";
import { getDashboardSnapshot } from "@/lib/reporting/aggregates";
import { writeAuditLog } from "@/lib/audit";

export type BoardEmailDelivery = {
  mode: "file" | "console";
  recipients: string[];
  subject: string;
  artifactPath: string | null;
  generatedAt: string;
  scheduleId: string | null;
};

function reportOutputDir(): string {
  return (
    process.env.REPORT_EMAIL_DIR?.trim() ||
    path.join(process.cwd(), "tmp", "board-reports")
  );
}

function emailMode(): "file" | "console" {
  const raw = (process.env.REPORT_EMAIL_MODE ?? "file").toLowerCase();
  return raw === "console" ? "console" : "file";
}

export function renderBoardReportHtml(
  snapshot: DashboardSnapshot,
  opts: { title: string; recipients: string[] },
): string {
  const kindRows = snapshot.byKind
    .map(
      (row) =>
        `<tr>
          <td>${row.kind}</td>
          <td style="text-align:right">${row.obligationCount}</td>
          <td style="text-align:right">${formatGhs(row.expected)}</td>
          <td style="text-align:right">${formatGhs(row.paid)}</td>
          <td style="text-align:right">${formatGhs(row.outstanding)}</td>
        </tr>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(opts.title)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #0f172a; margin: 24px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .meta { color: #64748b; font-size: 13px; margin-bottom: 20px; }
    .tiles { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .tile { border: 1px solid #cbd5e1; padding: 12px 16px; min-width: 140px; }
    .tile span { display: block; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
    .tile strong { font-size: 20px; }
    table { border-collapse: collapse; width: 100%; font-size: 14px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; }
    th { color: #475569; font-weight: 600; }
  </style>
</head>
<body>
  <h1>${escapeHtml(opts.title)}</h1>
  <p class="meta">
    Generated ${escapeHtml(snapshot.generatedAt)} · live DB ·
    recipients: ${escapeHtml(opts.recipients.join(", "))}
  </p>
  <div class="tiles">
    <div class="tile"><span>Expected</span><strong>${formatGhs(snapshot.totals.expected)}</strong></div>
    <div class="tile"><span>Paid</span><strong>${formatGhs(snapshot.totals.paid)}</strong></div>
    <div class="tile"><span>Outstanding</span><strong>${formatGhs(snapshot.totals.outstanding)}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Kind</th>
        <th>Obligations</th>
        <th>Expected</th>
        <th>Paid</th>
        <th>Outstanding</th>
      </tr>
    </thead>
    <tbody>
      ${kindRows}
    </tbody>
  </table>
  <p class="meta" style="margin-top:24px">
    Source contract: ${escapeHtml(snapshot.financeContract)}. Reporting reads aggregates only.
  </p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Demo-friendly monthly Board email.
 * Default mode writes HTML under tmp/board-reports (or REPORT_EMAIL_DIR).
 * Set REPORT_EMAIL_MODE=console to print path + subject instead.
 */
export async function sendMonthlyBoardReport(opts?: {
  actorId?: string | null;
  scheduleId?: string | null;
}): Promise<BoardEmailDelivery> {
  const template = await ensureDefaultBoardTemplate();
  const schedule =
    template.schedules.find((s) => s.id === opts?.scheduleId) ??
    template.schedules.find((s) => s.isActive) ??
    template.schedules[0];

  const recipients =
    schedule?.distributionList?.length
      ? schedule.distributionList
      : ["board@ltjbm.local"];

  const snapshot = await getDashboardSnapshot();
  const subject = `${template.layout.title} — ${new Date().toISOString().slice(0, 7)}`;
  const html = renderBoardReportHtml(snapshot, {
    title: template.layout.title,
    recipients,
  });

  const mode = emailMode();
  let artifactPath: string | null = null;

  if (mode === "file") {
    const dir = reportOutputDir();
    await mkdir(dir, { recursive: true });
    const filename = `board-report-${new Date().toISOString().replace(/[:.]/g, "-")}.html`;
    artifactPath = path.join(dir, filename);
    await writeFile(artifactPath, html, "utf8");
  } else {
    console.log("[board-report]", subject);
    console.log(html.slice(0, 500), "...");
  }

  if (schedule?.id) {
    await markScheduleRan(schedule.id);
  }

  await writeAuditLog({
    actorId: opts?.actorId,
    action: "report.board.email",
    entityType: "ReportSchedule",
    entityId: schedule?.id ?? null,
    metadata: {
      mode,
      recipients,
      artifactPath,
      totals: snapshot.totals,
    },
  });

  return {
    mode,
    recipients,
    subject,
    artifactPath,
    generatedAt: snapshot.generatedAt,
    scheduleId: schedule?.id ?? null,
  };
}
