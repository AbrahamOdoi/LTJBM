import { prisma } from "@/lib/db";
import { pageResult, type PageResult } from "@/lib/data-table";
import { ALL_ROLES, type Role } from "@/lib/roles";

export async function listDomainLists(opts?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PageResult<{
  id: string;
  key: string;
  label: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  values: {
    id: string;
    value: string;
    label: string;
    parentValue: string | null;
    sortOrder: number;
    isActive: boolean;
  }[];
  _count: { values: number };
}>> {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = opts?.pageSize ?? 25;
  const q = opts?.q?.trim();
  const where = q
    ? {
        OR: [
          { key: { contains: q, mode: "insensitive" as const } },
          { label: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [items, total] = await Promise.all([
    prisma.domainList.findMany({
      where,
      orderBy: { label: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        values: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
        _count: { select: { values: true } },
      },
    }),
    prisma.domainList.count({ where }),
  ]);

  return pageResult(items, total, page, pageSize);
}

export async function getDomainList(id: string) {
  return prisma.domainList.findUnique({
    where: { id },
    include: {
      values: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
    },
  });
}

export async function listUsers(opts?: {
  q?: string;
  role?: Role | string;
  status?: "active" | "inactive" | string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = opts?.pageSize ?? 25;
  const q = opts?.q?.trim();
  const role =
    opts?.role && (ALL_ROLES as string[]).includes(opts.role)
      ? (opts.role as Role)
      : undefined;
  const isActive =
    opts?.status === "active"
      ? true
      : opts?.status === "inactive"
        ? false
        : undefined;

  const where = {
    ...(role ? { role } : {}),
    ...(isActive === undefined ? {} : { isActive }),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        branchScopes: {
          include: {
            branch: { select: { id: true, name: true, code: true } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return pageResult(items, total, page, pageSize);
}

export async function getUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      branchScopes: {
        include: {
          branch: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
}

export async function listBranchesForAdmin() {
  return prisma.branch.findMany({
    orderBy: [{ isHq: "desc" }, { name: "asc" }],
    select: { id: true, name: true, code: true, country: true, isHq: true },
  });
}

export async function adminConsoleStats() {
  const [userCount, domainCount, memberCount, activeUsers] = await Promise.all([
    prisma.user.count(),
    prisma.domainList.count(),
    prisma.member.count(),
    prisma.user.count({ where: { isActive: true } }),
  ]);
  return { userCount, domainCount, memberCount, activeUsers };
}
