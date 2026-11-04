import { prisma } from "@/lib/db";

export type MemberExportRow = {
  memberNumber: string | null;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  status: string;
  branchCode: string;
  branchName: string;
  cellName: string | null;
  fellowshipName: string | null;
  householdName: string | null;
  photoKey: string | null;
  createdAt: string;
  updatedAt: string;
};

function csvEscape(value: string | null | undefined): string {
  const raw = value ?? "";
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export async function buildMemberExportRows(): Promise<MemberExportRow[]> {
  const members = await prisma.member.findMany({
    orderBy: [{ branch: { code: "asc" } }, { lastName: "asc" }, { firstName: "asc" }],
    include: {
      branch: { select: { code: true, name: true } },
      groups: {
        where: { endedAt: null },
        include: {
          cell: { select: { name: true } },
          fellowshipMinistry: { select: { name: true } },
        },
      },
      households: {
        include: { household: { select: { name: true } } },
        take: 1,
      },
    },
  });

  return members.map((m) => {
    const cell = m.groups.find((g) => g.kind === "Cell")?.cell?.name ?? null;
    const fellowship =
      m.groups.find((g) => g.kind === "Fellowship")?.fellowshipMinistry?.name ??
      null;
    const household = m.households[0]?.household.name ?? null;
    return {
      memberNumber: m.memberNumber,
      firstName: m.firstName,
      lastName: m.lastName,
      otherNames: m.otherNames,
      dateOfBirth: m.dateOfBirth
        ? m.dateOfBirth.toISOString().slice(0, 10)
        : null,
      gender: m.gender,
      phone: m.phone,
      email: m.email,
      addressLine1: m.addressLine1,
      addressLine2: m.addressLine2,
      city: m.city,
      region: m.region,
      country: m.country,
      status: m.status,
      branchCode: m.branch.code,
      branchName: m.branch.name,
      cellName: cell,
      fellowshipName: fellowship,
      householdName: household,
      photoKey: m.photoKey,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  });
}

export function memberRowsToCsv(rows: MemberExportRow[]): string {
  const headers: Array<keyof MemberExportRow> = [
    "memberNumber",
    "firstName",
    "lastName",
    "otherNames",
    "dateOfBirth",
    "gender",
    "phone",
    "email",
    "addressLine1",
    "addressLine2",
    "city",
    "region",
    "country",
    "status",
    "branchCode",
    "branchName",
    "cellName",
    "fellowshipName",
    "householdName",
    "photoKey",
    "createdAt",
    "updatedAt",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export async function buildLogicalBackupPayload() {
  const [
    exportedAt,
    users,
    branches,
    cells,
    fellowships,
    domains,
    members,
    households,
    auditSample,
  ] = await Promise.all([
    Promise.resolve(new Date().toISOString()),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        branchScopes: { select: { branchId: true } },
      },
    }),
    prisma.branch.findMany(),
    prisma.cell.findMany(),
    prisma.fellowshipMinistry.findMany(),
    prisma.domainList.findMany({ include: { values: true } }),
    buildMemberExportRows(),
    prisma.household.findMany({
      include: { members: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        actorId: true,
      },
    }),
  ]);

  return {
    format: "ltjbm-cdms-logical-backup",
    version: 1,
    exportedAt,
    note:
      "Demo logical snapshot for Section 8 export/restore narrative. Production restore uses Postgres pg_dump/pg_restore (see docs/backup-restore.md).",
    counts: {
      users: users.length,
      branches: branches.length,
      cells: cells.length,
      fellowships: fellowships.length,
      domains: domains.length,
      members: members.length,
      households: households.length,
      auditSample: auditSample.length,
    },
    data: {
      users,
      branches,
      cells,
      fellowships,
      domains,
      members,
      households,
      recentAudit: auditSample,
    },
  };
}
