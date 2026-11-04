import type { MemberStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nextMemberNumber } from "@/lib/members/queries";
import {
  MIGRATE_TARGET_FIELDS,
  parseCsv,
  type ColumnMapping,
  type MigrateTargetKey,
} from "@/lib/admin/migrate-csv";

export {
  MIGRATE_TARGET_FIELDS,
  memberImportTemplateCsv,
  parseCsv,
  suggestMapping,
  type ColumnMapping,
  type MigrateTargetKey,
  type ParsedCsv,
} from "@/lib/admin/migrate-csv";

const STATUS_SET = new Set<string>([
  "Active",
  "Visitor",
  "Inactive",
  "Transferred",
  "Deceased",
  "Suspended",
]);

export type MigrateRowIssue = {
  row: number;
  level: "error" | "warning";
  message: string;
};

export type MigrateRowPreview = {
  row: number;
  firstName: string;
  lastName: string;
  branchCode: string;
  status: string;
  ok: boolean;
};

export type MigrateDryRunResult = {
  total: number;
  valid: number;
  errorCount: number;
  warningCount: number;
  issues: MigrateRowIssue[];
  preview: MigrateRowPreview[];
  mapping: ColumnMapping;
};

function mappedValue(
  row: Record<string, string>,
  mapping: ColumnMapping,
  key: MigrateTargetKey,
): string {
  const col = mapping[key];
  if (!col) return "";
  return (row[col] ?? "").trim();
}

function parseDate(value: string | undefined): Date | null | "invalid" {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "invalid";
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

type ResolvedRow = {
  rowNum: number;
  memberNumber: string | null;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  status: MemberStatus;
  branchId: string;
  branchCode: string;
  cellId: string | null;
  fellowshipMinistryId: string | null;
  householdName: string | null;
  joinedAt: Date | null;
  baptismDate: Date | null;
  confirmationDate: Date | null;
  issues: MigrateRowIssue[];
};

async function resolveRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): Promise<ResolvedRow[]> {
  const [branches, cells, fellowships, existingNumbers, existingPhones] =
    await Promise.all([
      prisma.branch.findMany({ select: { id: true, code: true } }),
      prisma.cell.findMany({ select: { id: true, name: true, branchId: true } }),
      prisma.fellowshipMinistry.findMany({
        select: { id: true, name: true, code: true },
      }),
      prisma.member.findMany({
        where: { memberNumber: { not: null } },
        select: { memberNumber: true },
      }),
      prisma.member.findMany({
        where: { phone: { not: null } },
        select: { phone: true, firstName: true, lastName: true },
        take: 5000,
      }),
    ]);

  const branchByCode = new Map(
    branches.map((b) => [b.code.toLowerCase(), b]),
  );
  const existingNumberSet = new Set(
    existingNumbers.map((m) => m.memberNumber!.toLowerCase()),
  );
  const phoneIndex = new Map(
    existingPhones
      .filter((m) => m.phone)
      .map((m) => [m.phone!.replace(/\s+/g, ""), true] as const),
  );

  const seenNumbers = new Set<string>();
  const resolved: ResolvedRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const issues: MigrateRowIssue[] = [];
    const firstName = mappedValue(rows[i], mapping, "firstName");
    const lastName = mappedValue(rows[i], mapping, "lastName");
    const branchCode = mappedValue(rows[i], mapping, "branchCode");
    const memberNumberRaw = mappedValue(rows[i], mapping, "memberNumber");
    const statusRaw = mappedValue(rows[i], mapping, "status") || "Active";

    if (!firstName) {
      issues.push({ row: rowNum, level: "error", message: "First name is required." });
    }
    if (!lastName) {
      issues.push({ row: rowNum, level: "error", message: "Last name is required." });
    }
    if (!branchCode) {
      issues.push({ row: rowNum, level: "error", message: "Branch code is required." });
    }

    const branch = branchByCode.get(branchCode.toLowerCase());
    if (branchCode && !branch) {
      issues.push({
        row: rowNum,
        level: "error",
        message: `Unknown branch code "${branchCode}".`,
      });
    }

    if (!STATUS_SET.has(statusRaw)) {
      issues.push({
        row: rowNum,
        level: "error",
        message: `Invalid status "${statusRaw}".`,
      });
    }

    const dob = parseDate(mappedValue(rows[i], mapping, "dateOfBirth"));
    if (dob === "invalid") {
      issues.push({
        row: rowNum,
        level: "error",
        message: "dateOfBirth must be YYYY-MM-DD.",
      });
    }
    const joinedAt = parseDate(mappedValue(rows[i], mapping, "joinedAt"));
    if (joinedAt === "invalid") {
      issues.push({
        row: rowNum,
        level: "error",
        message: "joinedAt must be YYYY-MM-DD.",
      });
    }
    const baptismDate = parseDate(mappedValue(rows[i], mapping, "baptismDate"));
    if (baptismDate === "invalid") {
      issues.push({
        row: rowNum,
        level: "error",
        message: "baptismDate must be YYYY-MM-DD.",
      });
    }
    const confirmationDate = parseDate(
      mappedValue(rows[i], mapping, "confirmationDate"),
    );
    if (confirmationDate === "invalid") {
      issues.push({
        row: rowNum,
        level: "error",
        message: "confirmationDate must be YYYY-MM-DD.",
      });
    }

    const email = mappedValue(rows[i], mapping, "email") || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      issues.push({ row: rowNum, level: "error", message: "Invalid email." });
    }

    const memberNumber = memberNumberRaw || null;
    if (memberNumber) {
      const key = memberNumber.toLowerCase();
      if (existingNumberSet.has(key) || seenNumbers.has(key)) {
        issues.push({
          row: rowNum,
          level: "error",
          message: `Member number "${memberNumber}" already exists.`,
        });
      }
      seenNumbers.add(key);
    }

    const phone = mappedValue(rows[i], mapping, "phone") || null;
    if (phone && phoneIndex.has(phone.replace(/\s+/g, ""))) {
      issues.push({
        row: rowNum,
        level: "warning",
        message: `Phone ${phone} already on an existing member (possible duplicate).`,
      });
    }

    const cellName = mappedValue(rows[i], mapping, "cellName");
    let cellId: string | null = null;
    if (cellName && branch) {
      const cell = cells.find(
        (c) =>
          c.branchId === branch.id &&
          c.name.toLowerCase() === cellName.toLowerCase(),
      );
      if (!cell) {
        issues.push({
          row: rowNum,
          level: "warning",
          message: `Cell "${cellName}" not found in branch — will skip cell link.`,
        });
      } else {
        cellId = cell.id;
      }
    }

    const fellowshipName = mappedValue(rows[i], mapping, "fellowshipName");
    let fellowshipMinistryId: string | null = null;
    if (fellowshipName) {
      const fellowship = fellowships.find(
        (f) =>
          f.name.toLowerCase() === fellowshipName.toLowerCase() ||
          f.code.toLowerCase() === fellowshipName.toLowerCase(),
      );
      if (!fellowship) {
        issues.push({
          row: rowNum,
          level: "warning",
          message: `Fellowship "${fellowshipName}" not found — will skip link.`,
        });
      } else {
        fellowshipMinistryId = fellowship.id;
      }
    }

    resolved.push({
      rowNum,
      memberNumber,
      firstName,
      lastName,
      otherNames: mappedValue(rows[i], mapping, "otherNames") || null,
      dateOfBirth: dob === "invalid" ? null : dob,
      gender: mappedValue(rows[i], mapping, "gender") || null,
      phone,
      email,
      addressLine1: mappedValue(rows[i], mapping, "addressLine1") || null,
      addressLine2: mappedValue(rows[i], mapping, "addressLine2") || null,
      city: mappedValue(rows[i], mapping, "city") || null,
      region: mappedValue(rows[i], mapping, "region") || null,
      country: mappedValue(rows[i], mapping, "country") || null,
      status: (STATUS_SET.has(statusRaw) ? statusRaw : "Active") as MemberStatus,
      branchId: branch?.id ?? "",
      branchCode,
      cellId,
      fellowshipMinistryId,
      householdName: mappedValue(rows[i], mapping, "householdName") || null,
      joinedAt: joinedAt === "invalid" ? null : joinedAt,
      baptismDate: baptismDate === "invalid" ? null : baptismDate,
      confirmationDate:
        confirmationDate === "invalid" ? null : confirmationDate,
      issues,
    });
  }

  return resolved;
}

export async function dryRunMemberImport(
  csvText: string,
  mapping: ColumnMapping,
): Promise<MigrateDryRunResult> {
  const required = MIGRATE_TARGET_FIELDS.filter((f) => f.required);
  for (const field of required) {
    if (!mapping[field.key]) {
      return {
        total: 0,
        valid: 0,
        errorCount: 1,
        warningCount: 0,
        issues: [
          {
            row: 0,
            level: "error",
            message: `Map a column to required field "${field.label}".`,
          },
        ],
        preview: [],
        mapping,
      };
    }
  }

  const parsed = parseCsv(csvText);
  if (parsed.rows.length === 0) {
    return {
      total: 0,
      valid: 0,
      errorCount: 1,
      warningCount: 0,
      issues: [
        { row: 0, level: "error", message: "CSV has no data rows." },
      ],
      preview: [],
      mapping,
    };
  }

  const resolved = await resolveRows(parsed.rows, mapping);
  const issues = resolved.flatMap((r) => r.issues);
  const errorCount = issues.filter((i) => i.level === "error").length;
  const warningCount = issues.filter((i) => i.level === "warning").length;
  const valid = resolved.filter((r) =>
    r.issues.every((i) => i.level !== "error"),
  ).length;

  return {
    total: resolved.length,
    valid,
    errorCount,
    warningCount,
    issues: issues.slice(0, 100),
    preview: resolved.slice(0, 25).map((r) => ({
      row: r.rowNum,
      firstName: r.firstName,
      lastName: r.lastName,
      branchCode: r.branchCode,
      status: r.status,
      ok: r.issues.every((i) => i.level !== "error"),
    })),
    mapping,
  };
}

export type MigrateCommitResult = {
  created: number;
  skipped: number;
  memberIds: string[];
  issues: MigrateRowIssue[];
};

export async function commitMemberImport(
  csvText: string,
  mapping: ColumnMapping,
  actorId: string,
): Promise<MigrateCommitResult> {
  const dry = await dryRunMemberImport(csvText, mapping);
  if (dry.errorCount > 0) {
    return {
      created: 0,
      skipped: dry.total,
      memberIds: [],
      issues: dry.issues.filter((i) => i.level === "error"),
    };
  }

  const parsed = parseCsv(csvText);
  const resolved = await resolveRows(parsed.rows, mapping);
  const memberIds: string[] = [];
  let created = 0;
  let skipped = 0;

  for (const row of resolved) {
    if (row.issues.some((i) => i.level === "error") || !row.branchId) {
      skipped++;
      continue;
    }

    const memberNumber =
      row.memberNumber ?? (await nextMemberNumber(row.branchCode || "HQ"));

    const createdMember = await prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          memberNumber,
          firstName: row.firstName,
          lastName: row.lastName,
          otherNames: row.otherNames,
          dateOfBirth: row.dateOfBirth,
          gender: row.gender,
          phone: row.phone,
          email: row.email,
          addressLine1: row.addressLine1,
          addressLine2: row.addressLine2,
          city: row.city,
          region: row.region,
          country: row.country,
          status: row.status,
          branchId: row.branchId,
          joinedAt: row.joinedAt,
          baptismDate: row.baptismDate,
          confirmationDate: row.confirmationDate,
        },
      });

      if (row.cellId) {
        await tx.groupMembership.create({
          data: { memberId: member.id, kind: "Cell", cellId: row.cellId },
        });
      }
      if (row.fellowshipMinistryId) {
        await tx.groupMembership.create({
          data: {
            memberId: member.id,
            kind: "Fellowship",
            fellowshipMinistryId: row.fellowshipMinistryId,
          },
        });
      }
      if (row.householdName) {
        const household = await tx.household.create({
          data: { name: row.householdName },
        });
        await tx.householdMember.create({
          data: {
            householdId: household.id,
            memberId: member.id,
            relation: "Head",
          },
        });
      }

      await tx.memberStatusHistory.create({
        data: {
          memberId: member.id,
          fromStatus: null,
          toStatus: row.status,
          toBranchId: row.branchId,
          reason: "CSV migration import",
          changedById: actorId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: "admin.members.import",
          entityType: "Member",
          entityId: member.id,
          metadata: {
            source: "csv-migration-wizard",
            row: row.rowNum,
            memberNumber,
          } as Prisma.InputJsonValue,
        },
      });

      return member;
    });

    memberIds.push(createdMember.id);
    created++;
  }

  return { created, skipped, memberIds, issues: dry.issues };
}
