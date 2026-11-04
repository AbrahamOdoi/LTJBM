import { NextResponse } from "next/server";
import {
  withReportTemplateEdit,
  withReportingAccess,
} from "@/app/api/reports/_guard";
import {
  ensureDefaultBoardTemplate,
  listReportTemplates,
} from "@/lib/reporting/service";
import { requireReportTemplateEdit } from "@/lib/auth-guards";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  DEFAULT_BOARD_LAYOUT,
  safeParseReportLayout,
} from "@/lib/reporting/template";
import { Prisma } from "@prisma/client";

export async function GET() {
  return withReportingAccess(async () => {
    await ensureDefaultBoardTemplate();
    const templates = await listReportTemplates();
    return NextResponse.json({ templates });
  });
}

/** Admin / Data Centre: create a template (layout optional — defaults to Board). */
export async function POST(request: Request) {
  return withReportTemplateEdit(async () => {
    const session = await requireReportTemplateEdit();
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      layout?: unknown;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    let layout = DEFAULT_BOARD_LAYOUT;
    if (body.layout !== undefined) {
      const parsed = safeParseReportLayout(body.layout);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      layout = parsed.data;
    }

    const created = await prisma.reportTemplate.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        layout: layout as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
      include: { schedules: true },
    });

    await writeAuditLog({
      actorId: session.user.id,
      action: "report.template.create",
      entityType: "ReportTemplate",
      entityId: created.id,
      metadata: { name: created.name },
    });

    const templates = await listReportTemplates();
    return NextResponse.json({
      id: created.id,
      templates,
    });
  }, request);
}
