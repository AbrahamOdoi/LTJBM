import { NextResponse } from "next/server";
import { AuthGuardError, requireAdmin } from "@/lib/auth-guards";
import { writeAuditLog } from "@/lib/audit";
import { buildLogicalBackupPayload } from "@/lib/admin/export";

export async function GET() {
  try {
    const session = await requireAdmin();
    const payload = await buildLogicalBackupPayload();

    await writeAuditLog({
      actorId: session.user.id,
      action: "admin.backup.snapshot",
      entityType: "System",
      metadata: { counts: payload.counts },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="ltjbm-logical-backup-${stamp}.json"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthGuardError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Snapshot failed" }, { status: 500 });
  }
}
