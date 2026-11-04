import { ObligationKind, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getScopedBranchIds,
  memberBranchWhere,
  type SessionUserLike,
} from "@/lib/members/access";
import { computeObligationBalances } from "@/lib/finance/balances";
import { obligationKindLabel } from "@/lib/church-labels";
import { toMoneyNumber } from "@/lib/finance/money";
import {
  canAccessFinanceDetailReports,
  type Role,
} from "@/lib/roles";
import { ReportingValidationError } from "@/lib/reporting/service";
import type { ReportColumn, ReportRow } from "@/lib/reporting/standard-reports";

export const CUSTOM_DATASETS = ["members", "contributions"] as const;
export type CustomDataset = (typeof CUSTOM_DATASETS)[number];

const MEMBER_COLUMNS = [
  { key: "memberNumber", label: "Member #" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "status", label: "Status" },
  { key: "branch", label: "Branch" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "registered", label: "Registered" },
] as const;

const CONTRIBUTION_COLUMNS = [
  { key: "member", label: "Member" },
  { key: "memberNumber", label: "Member #" },
  { key: "kind", label: "Kind" },
  { key: "typeName", label: "Type" },
  { key: "period", label: "Period start" },
  { key: "expected", label: "Expected" },
  { key: "paid", label: "Paid" },
  { key: "outstanding", label: "Outstanding" },
] as const;

export function columnsForDataset(dataset: CustomDataset): ReportColumn[] {
  if (dataset === "members") {
    return MEMBER_COLUMNS.map((c) => ({ key: c.key, label: c.label }));
  }
  return CONTRIBUTION_COLUMNS.map((c) => ({ key: c.key, label: c.label }));
}

export function canUseCustomDataset(
  role: Role | string | undefined | null,
  dataset: CustomDataset,
): boolean {
  if (dataset === "members") return true;
  return canAccessFinanceDetailReports(role);
}

const filtersSchema = z.object({
  branchId: z.string().optional(),
  status: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  kind: z.string().optional(),
  q: z.string().optional(),
});

export type CustomReportFilters = z.infer<typeof filtersSchema>;

const saveSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  dataset: z.enum(CUSTOM_DATASETS),
  filters: filtersSchema.default({}),
  columns: z.array(z.string().min(1)).min(1).max(20),
});

export type SaveCustomReportInput = z.infer<typeof saveSchema>;

export function parseSaveCustomReport(input: unknown): SaveCustomReportInput {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    throw new ReportingValidationError(
      parsed.error.issues[0]?.message ?? "Invalid custom report definition.",
      400,
    );
  }
  return parsed.data;
}

function assertColumns(dataset: CustomDataset, columns: string[]) {
  const allowed = new Set(columnsForDataset(dataset).map((c) => c.key));
  for (const col of columns) {
    if (!allowed.has(col)) {
      throw new ReportingValidationError(
        `Column "${col}" is not available for ${dataset}.`,
        400,
      );
    }
  }
}

export async function listSavedReports(user: SessionUserLike) {
  const rows = await prisma.savedReport.findMany({
    where: {
      OR: [
        { roleScope: String(user.role) },
        { createdById: user.id },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
  return rows
    .filter((r) => canUseCustomDataset(user.role, r.dataset as CustomDataset))
    .map(serializeSavedReport);
}

export async function getSavedReport(user: SessionUserLike, id: string) {
  const row = await prisma.savedReport.findUnique({ where: { id } });
  if (!row) return null;
  if (
    row.roleScope !== String(user.role) &&
    row.createdById !== user.id
  ) {
    return null;
  }
  if (!canUseCustomDataset(user.role, row.dataset as CustomDataset)) {
    return null;
  }
  return serializeSavedReport(row);
}

export async function createSavedReport(
  user: SessionUserLike,
  input: SaveCustomReportInput,
) {
  if (!canUseCustomDataset(user.role, input.dataset)) {
    throw new ReportingValidationError(
      "Contributions custom reports are Head Office Financial Secretary / Data Centre only.",
      403,
    );
  }
  assertColumns(input.dataset, input.columns);

  const created = await prisma.savedReport.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      dataset: input.dataset,
      filters: input.filters as Prisma.InputJsonValue,
      columns: input.columns as Prisma.InputJsonValue,
      roleScope: String(user.role),
      createdById: user.id,
    },
  });
  return serializeSavedReport(created);
}

export async function deleteSavedReport(user: SessionUserLike, id: string) {
  const existing = await getSavedReport(user, id);
  if (!existing) {
    throw new ReportingValidationError("Saved report not found.", 404);
  }
  await prisma.savedReport.delete({ where: { id } });
  return { ok: true };
}

export type CustomRunResult = {
  generatedAt: string;
  name: string;
  dataset: CustomDataset;
  columns: ReportColumn[];
  rows: ReportRow[];
  summary: string;
};

export async function runCustomReportDefinition(
  user: SessionUserLike,
  def: {
    name?: string;
    dataset: CustomDataset;
    filters: CustomReportFilters;
    columns: string[];
  },
): Promise<CustomRunResult> {
  if (!canUseCustomDataset(user.role, def.dataset)) {
    throw new ReportingValidationError(
      "This dataset is not available for your ministry role.",
      403,
    );
  }
  assertColumns(def.dataset, def.columns);

  const allColumns = columnsForDataset(def.dataset);
  const selected = allColumns.filter((c) => def.columns.includes(c.key));
  const generatedAt = new Date().toISOString();

  if (def.dataset === "members") {
    const rows = await runMembersDataset(user, def.filters, def.columns);
    return {
      generatedAt,
      name: def.name ?? "Custom members report",
      dataset: def.dataset,
      columns: selected,
      rows,
      summary: `${rows.length} member row(s).`,
    };
  }

  const rows = await runContributionsDataset(def.filters, def.columns);
  return {
    generatedAt,
    name: def.name ?? "Custom contributions report",
    dataset: def.dataset,
    columns: selected,
    rows,
    summary: `${rows.length} contribution row(s). Individual giving — Head Office only.`,
  };
}

export async function runSavedReport(
  user: SessionUserLike,
  id: string,
): Promise<CustomRunResult> {
  const saved = await getSavedReport(user, id);
  if (!saved) {
    throw new ReportingValidationError("Saved report not found.", 404);
  }
  return runCustomReportDefinition(user, {
    name: saved.name,
    dataset: saved.dataset,
    filters: saved.filters,
    columns: saved.columns,
  });
}

async function runMembersDataset(
  user: SessionUserLike,
  filters: CustomReportFilters,
  columns: string[],
) {
  const scoped = await getScopedBranchIds(user);
  const members = await prisma.member.findMany({
    where: {
      ...memberBranchWhere(scoped),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.status
        ? {
            status: filters.status as
              | "Active"
              | "Inactive"
              | "Transferred"
              | "Deceased"
              | "Suspended",
          }
        : {}),
      ...(filters.q
        ? {
            OR: [
              { firstName: { contains: filters.q, mode: "insensitive" } },
              { lastName: { contains: filters.q, mode: "insensitive" } },
              { memberNumber: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filters.periodStart || filters.periodEnd
        ? {
            createdAt: {
              ...(filters.periodStart
                ? { gte: new Date(filters.periodStart) }
                : {}),
              ...(filters.periodEnd
                ? { lte: new Date(filters.periodEnd) }
                : {}),
            },
          }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 500,
    select: {
      memberNumber: true,
      firstName: true,
      lastName: true,
      status: true,
      phone: true,
      email: true,
      createdAt: true,
      branch: { select: { name: true, code: true } },
    },
  });

  return members.map((m) => {
    const full: ReportRow = {
      memberNumber: m.memberNumber,
      firstName: m.firstName,
      lastName: m.lastName,
      status: m.status,
      branch: `${m.branch.name} (${m.branch.code})`,
      phone: m.phone,
      email: m.email,
      registered: m.createdAt.toISOString().slice(0, 10),
    };
    return pickColumns(full, columns);
  });
}

async function runContributionsDataset(
  filters: CustomReportFilters,
  columns: string[],
) {
  const kind =
    filters.kind &&
    (Object.values(ObligationKind) as string[]).includes(filters.kind)
      ? (filters.kind as ObligationKind)
      : undefined;

  const obligations = await prisma.obligation.findMany({
    where: {
      obligationType: kind ? { kind } : undefined,
      ...(filters.periodStart || filters.periodEnd
        ? {
            periodStart: {
              ...(filters.periodStart
                ? { gte: new Date(filters.periodStart) }
                : {}),
              ...(filters.periodEnd
                ? { lte: new Date(filters.periodEnd) }
                : {}),
            },
          }
        : {}),
      ...(filters.branchId
        ? { member: { branchId: filters.branchId } }
        : {}),
      ...(filters.q
        ? {
            member: {
              OR: [
                { firstName: { contains: filters.q, mode: "insensitive" } },
                { lastName: { contains: filters.q, mode: "insensitive" } },
                {
                  memberNumber: {
                    contains: filters.q,
                    mode: "insensitive",
                  },
                },
              ],
            },
          }
        : {}),
    },
    include: {
      obligationType: true,
      payments: true,
      member: {
        select: {
          firstName: true,
          lastName: true,
          memberNumber: true,
        },
      },
    },
    orderBy: { periodStart: "desc" },
    take: 500,
  });

  return obligations.map((ob) => {
    const bal = computeObligationBalances(ob);
    const full: ReportRow = {
      member: `${ob.member.firstName} ${ob.member.lastName}`,
      memberNumber: ob.member.memberNumber,
      kind: obligationKindLabel(ob.obligationType.kind),
      typeName: ob.obligationType.name,
      period: ob.periodStart.toISOString().slice(0, 10),
      expected: toMoneyNumber(bal.expected),
      paid: toMoneyNumber(bal.paid),
      outstanding: toMoneyNumber(bal.outstanding),
    };
    return pickColumns(full, columns);
  });
}

function pickColumns(row: ReportRow, columns: string[]): ReportRow {
  const out: ReportRow = {};
  for (const key of columns) {
    out[key] = row[key] ?? null;
  }
  return out;
}

function serializeSavedReport(row: {
  id: string;
  name: string;
  description: string | null;
  dataset: string;
  filters: Prisma.JsonValue;
  columns: Prisma.JsonValue;
  roleScope: string;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const filters = filtersSchema.catch({}).parse(row.filters ?? {});
  const columns = Array.isArray(row.columns)
    ? row.columns.map(String)
    : columnsForDataset(row.dataset as CustomDataset).map((c) => c.key);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    dataset: row.dataset as CustomDataset,
    filters,
    columns,
    roleScope: row.roleScope,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
