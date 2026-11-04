import { Prisma } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  addChartToLayout,
  addFieldToLayout,
  DEFAULT_BOARD_LAYOUT,
  parseReportLayout,
  safeParseReportLayout,
  type ChartGroupBy,
  type ChartMetric,
  type ChartType,
  type FieldSource,
  type ReportLayout,
} from "@/lib/reporting/template";

export const BOARD_TEMPLATE_NAME = "Board monthly rollup";

export class ReportingValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReportingValidationError";
    this.status = status;
  }
}

export async function listReportTemplates() {
  const rows = await prisma.reportTemplate.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: {
      schedules: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  return rows.map(serializeTemplate);
}

export async function getActiveBoardTemplate() {
  const row =
    (await prisma.reportTemplate.findFirst({
      where: { name: BOARD_TEMPLATE_NAME, isActive: true },
      include: { schedules: true },
    })) ??
    (await prisma.reportTemplate.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      include: { schedules: true },
    }));
  return row ? serializeTemplate(row) : null;
}

export async function getReportTemplate(id: string) {
  const row = await prisma.reportTemplate.findUnique({
    where: { id },
    include: { schedules: true },
  });
  return row ? serializeTemplate(row) : null;
}

export async function ensureDefaultBoardTemplate() {
  const existing = await prisma.reportTemplate.findFirst({
    where: { name: BOARD_TEMPLATE_NAME },
    include: { schedules: true },
  });
  if (existing) return serializeTemplate(existing);

  const created = await prisma.reportTemplate.create({
    data: {
      name: BOARD_TEMPLATE_NAME,
      description:
        "Default Pastoral Board / Leadership Council Expected·Paid·Outstanding template",
      layout: DEFAULT_BOARD_LAYOUT as unknown as Prisma.InputJsonValue,
      isActive: true,
      schedules: {
        create: {
          cronExpression: "0 8 1 * *",
          distributionList: ["board@ltjbm.local", "council@ltjbm.local"],
          isActive: true,
        },
      },
    },
    include: { schedules: true },
  });
  return serializeTemplate(created);
}

export async function updateReportTemplateLayout(
  id: string,
  layout: ReportLayout,
  actorId?: string | null,
) {
  parseReportLayout(layout);
  const updated = await prisma.reportTemplate.update({
    where: { id },
    data: { layout: layout as unknown as Prisma.InputJsonValue },
    include: { schedules: true },
  });
  await writeAuditLog({
    actorId,
    action: "report.template.update",
    entityType: "ReportTemplate",
    entityId: id,
    metadata: { fieldCount: layout.fields.length, chartCount: layout.charts.length },
  });
  return serializeTemplate(updated);
}

export async function appendTemplateField(
  id: string,
  input: { label: string; source: FieldSource },
  actorId?: string | null,
) {
  const current = await prisma.reportTemplate.findUniqueOrThrow({ where: { id } });
  const parsed = safeParseReportLayout(current.layout);
  if (!parsed.success) {
    throw new ReportingValidationError(`Invalid stored layout: ${parsed.error}`);
  }
  const next = addFieldToLayout(parsed.data, input);
  return updateReportTemplateLayout(id, next, actorId);
}

export async function appendTemplateChart(
  id: string,
  input: {
    title: string;
    type: ChartType;
    metric: ChartMetric;
    groupBy: ChartGroupBy;
  },
  actorId?: string | null,
) {
  const current = await prisma.reportTemplate.findUniqueOrThrow({ where: { id } });
  const parsed = safeParseReportLayout(current.layout);
  if (!parsed.success) {
    throw new ReportingValidationError(`Invalid stored layout: ${parsed.error}`);
  }
  const next = addChartToLayout(parsed.data, input);
  return updateReportTemplateLayout(id, next, actorId);
}

export async function listReportSchedules() {
  const rows = await prisma.reportSchedule.findMany({
    include: { reportTemplate: true },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    cronExpression: row.cronExpression,
    distributionList: row.distributionList,
    isActive: row.isActive,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    reportTemplateId: row.reportTemplateId,
    reportTemplateName: row.reportTemplate.name,
  }));
}

export async function markScheduleRan(scheduleId: string) {
  return prisma.reportSchedule.update({
    where: { id: scheduleId },
    data: { lastRunAt: new Date() },
  });
}

function serializeTemplate(row: {
  id: string;
  name: string;
  description: string | null;
  layout: Prisma.JsonValue;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  schedules?: Array<{
    id: string;
    cronExpression: string;
    distributionList: string[];
    isActive: boolean;
    lastRunAt: Date | null;
  }>;
}) {
  const parsed = safeParseReportLayout(row.layout);
  const layout = parsed.success ? parsed.data : DEFAULT_BOARD_LAYOUT;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    layout,
    layoutValid: parsed.success,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    schedules: (row.schedules ?? []).map((s) => ({
      id: s.id,
      cronExpression: s.cronExpression,
      distributionList: s.distributionList,
      isActive: s.isActive,
      lastRunAt: s.lastRunAt?.toISOString() ?? null,
    })),
  };
}
