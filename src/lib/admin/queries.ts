import { prisma } from "@/lib/db";

export async function listDomainLists() {
  return prisma.domainList.findMany({
    orderBy: { label: "asc" },
    include: {
      values: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
      _count: { select: { values: true } },
    },
  });
}

export async function getDomainList(id: string) {
  return prisma.domainList.findUnique({
    where: { id },
    include: {
      values: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
    },
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
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
