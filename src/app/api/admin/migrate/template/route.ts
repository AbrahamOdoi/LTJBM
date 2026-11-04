import { NextResponse } from "next/server";
import { AuthGuardError, requireAdmin } from "@/lib/auth-guards";
import { memberImportTemplateCsv } from "@/lib/admin/migrate";

export async function GET() {
  try {
    await requireAdmin();
    const csv = memberImportTemplateCsv();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="ltjbm-member-import-template.csv"',
      },
    });
  } catch (e) {
    if (e instanceof AuthGuardError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Template failed" }, { status: 500 });
  }
}
