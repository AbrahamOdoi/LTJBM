import { z } from "zod";

/** Field sources available on Board templates (aggregates only — no individual giving). */
export const FIELD_SOURCES = [
  "totals.expected",
  "totals.paid",
  "totals.outstanding",
  "totals.obligationCount",
  "byKind",
  "byBranch",
  "byPeriod",
] as const;

export type FieldSource = (typeof FIELD_SOURCES)[number];

export const CHART_TYPES = ["bar", "donut"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export const CHART_METRICS = ["expected", "paid", "outstanding"] as const;
export type ChartMetric = (typeof CHART_METRICS)[number];

export const CHART_GROUP_BY = ["kind", "branch", "period"] as const;
export type ChartGroupBy = (typeof CHART_GROUP_BY)[number];

export const AUDIENCES = ["PastoralBoard", "LeadershipCouncil", "Both"] as const;
export type ReportAudience = (typeof AUDIENCES)[number];

const fieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  source: z.enum(FIELD_SOURCES),
});

const chartSchema = z.object({
  id: z.string().min(1),
  type: z.enum(CHART_TYPES),
  title: z.string().min(1),
  metric: z.enum(CHART_METRICS),
  groupBy: z.enum(CHART_GROUP_BY),
});

export const reportLayoutSchema = z.object({
  title: z.string().min(1),
  audience: z.enum(AUDIENCES),
  fields: z.array(fieldSchema),
  charts: z.array(chartSchema),
});

export type ReportLayout = z.infer<typeof reportLayoutSchema>;
export type ReportField = z.infer<typeof fieldSchema>;
export type ReportChart = z.infer<typeof chartSchema>;

export const DEFAULT_BOARD_LAYOUT: ReportLayout = {
  title: "Pastoral Board — Expected / Paid / Outstanding",
  audience: "Both",
  fields: [
    { id: "f-expected", label: "Expected", source: "totals.expected" },
    { id: "f-paid", label: "Paid", source: "totals.paid" },
    { id: "f-outstanding", label: "Outstanding", source: "totals.outstanding" },
    { id: "f-by-kind", label: "By obligation kind", source: "byKind" },
  ],
  charts: [
    {
      id: "c-kind-paid",
      type: "bar",
      title: "Paid by kind",
      metric: "paid",
      groupBy: "kind",
    },
  ],
};

export function parseReportLayout(raw: unknown): ReportLayout {
  return reportLayoutSchema.parse(raw);
}

export function safeParseReportLayout(raw: unknown): {
  success: true;
  data: ReportLayout;
} | {
  success: false;
  error: string;
} {
  const result = reportLayoutSchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((i) => i.message).join("; "),
    };
  }
  return { success: true, data: result.data };
}

export function newFieldId(): string {
  return `f-${Date.now().toString(36)}`;
}

export function newChartId(): string {
  return `c-${Date.now().toString(36)}`;
}

/** Merge a new field or chart into an existing layout (Data Centre live edit). */
export function addFieldToLayout(
  layout: ReportLayout,
  field: Omit<ReportField, "id"> & { id?: string },
): ReportLayout {
  return {
    ...layout,
    fields: [
      ...layout.fields,
      { id: field.id ?? newFieldId(), label: field.label, source: field.source },
    ],
  };
}

export function addChartToLayout(
  layout: ReportLayout,
  chart: Omit<ReportChart, "id"> & { id?: string },
): ReportLayout {
  return {
    ...layout,
    charts: [
      ...layout.charts,
      {
        id: chart.id ?? newChartId(),
        type: chart.type,
        title: chart.title,
        metric: chart.metric,
        groupBy: chart.groupBy,
      },
    ],
  };
}
