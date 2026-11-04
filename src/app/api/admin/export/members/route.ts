import { NextResponse } from "next/server";
import { AuthGuardError, requireAdmin } from "@/lib/auth-guards";
import { writeAuditLog } from "@/lib/audit";
import {
  buildMemberExportRows,
  memberRowsToCsv,
} from "@/lib/admin/export";

export async function GET(request: Request) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") === "json" ? "json" : "csv";
    const rows = await buildMemberExportRows();

    await writeAuditLog({
      actorId: session.user.id,
      action: "admin.members.export",
      entityType: "Member",
      metadata: { format, count: rows.length },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "json") {
      return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), count: rows.length, members: rows }, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="ltjbm-members-${stamp}.json"`,
        },
      });
    }

    const csv = memberRowsToCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ltjbm-members-${stamp}.csv"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthGuardError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
