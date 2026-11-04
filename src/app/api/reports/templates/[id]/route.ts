import { NextResponse } from "next/server";
import {
  withReportTemplateEdit,
  withReportingAccess,
} from "@/app/api/reports/_guard";
import {
  appendTemplateChart,
  appendTemplateField,
  getReportTemplate,
  updateReportTemplateLayout,
} from "@/lib/reporting/service";
import { requireReportTemplateEdit } from "@/lib/auth-guards";
import {
  CHART_GROUP_BY,
  CHART_METRICS,
  CHART_TYPES,
  FIELD_SOURCES,
  safeParseReportLayout,
  type ChartGroupBy,
  type ChartMetric,
  type ChartType,
  type FieldSource,
} from "@/lib/reporting/template";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  return withReportingAccess(async () => {
    const { id } = await context.params;
    const template = await getReportTemplate(id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ template });
  });
}

/**
 * Admin / Data Centre live edit.
 * Body:
 *  - { layout } — replace full layout
 *  - { addField: { label, source } }
 *  - { addChart: { title, type, metric, groupBy } }
 */
export async function PATCH(request: Request, context: Ctx) {
  return withReportTemplateEdit(async () => {
    const session = await requireReportTemplateEdit();
    const { id } = await context.params;
    const existing = await getReportTemplate(id);
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      layout?: unknown;
      addField?: { label?: string; source?: string };
      addChart?: {
        title?: string;
        type?: string;
        metric?: string;
        groupBy?: string;
      };
    };

    if (body.addField) {
      const label = body.addField.label?.trim();
      const source = body.addField.source;
      if (!label || !source || !(FIELD_SOURCES as readonly string[]).includes(source)) {
        return NextResponse.json(
          { error: `addField requires label and source in ${FIELD_SOURCES.join(", ")}` },
          { status: 400 },
        );
      }
      const template = await appendTemplateField(
        id,
        { label, source: source as FieldSource },
        session.user.id,
      );
      return NextResponse.json({ template });
    }

    if (body.addChart) {
      const title = body.addChart.title?.trim();
      const type = body.addChart.type;
      const metric = body.addChart.metric;
      const groupBy = body.addChart.groupBy;
      if (
        !title ||
        !type ||
        !metric ||
        !groupBy ||
        !(CHART_TYPES as readonly string[]).includes(type) ||
        !(CHART_METRICS as readonly string[]).includes(metric) ||
        !(CHART_GROUP_BY as readonly string[]).includes(groupBy)
      ) {
        return NextResponse.json(
          {
            error:
              "addChart requires title, type (bar|donut), metric (expected|paid|outstanding), groupBy (kind|branch|period)",
          },
          { status: 400 },
        );
      }
      const template = await appendTemplateChart(
        id,
        {
          title,
          type: type as ChartType,
          metric: metric as ChartMetric,
          groupBy: groupBy as ChartGroupBy,
        },
        session.user.id,
      );
      return NextResponse.json({ template });
    }

    if (body.layout !== undefined) {
      const parsed = safeParseReportLayout(body.layout);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      const template = await updateReportTemplateLayout(
        id,
        parsed.data,
        session.user.id,
      );
      return NextResponse.json({ template });
    }

    return NextResponse.json(
      { error: "Provide layout, addField, or addChart" },
      { status: 400 },
    );
  });
}
