import { PrismaClient, type Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "ChangeMe123!";

const demoUsers: Array<{
  email: string;
  name: string;
  role: Role;
}> = [
  {
    email: "admin@ltjbm.local",
    name: "System Admin",
    role: "Admin",
  },
  {
    email: "clerk@ltjbm.local",
    name: "Records Clerk",
    role: "RecordsClerk",
  },
  {
    email: "branch@ltjbm.local",
    name: "Branch Leader",
    role: "BranchLeader",
  },
  {
    email: "finance@ltjbm.local",
    name: "Financial Secretary",
    role: "FinancialSecretary",
  },
  {
    email: "board@ltjbm.local",
    name: "Pastoral Board Member",
    role: "PastoralBoard",
  },
  {
    email: "council@ltjbm.local",
    name: "Leadership Council Member",
    role: "LeadershipCouncil",
  },
];

async function main() {
  const passwordHash = await hash(SEED_PASSWORD, 12);

  const hq = await prisma.branch.upsert({
    where: { code: "HQ-ACCRA" },
    update: {},
    create: {
      name: "HQ Accra",
      code: "HQ-ACCRA",
      country: "Ghana",
      isHq: true,
      isInternational: false,
    },
  });

  const eastLegon = await prisma.branch.upsert({
    where: { code: "GH-EAST-LEGON" },
    update: {},
    create: {
      name: "East Legon",
      code: "GH-EAST-LEGON",
      country: "Ghana",
      isHq: false,
      isInternational: false,
    },
  });

  await prisma.branch.upsert({
    where: { code: "INT-LONDON" },
    update: {},
    create: {
      name: "London",
      code: "INT-LONDON",
      country: "United Kingdom",
      isHq: false,
      isInternational: true,
    },
  });

  for (const fellowship of [
    { name: "Men's Ministry", code: "MEN" },
    { name: "Women's Ministry", code: "WOMEN" },
    { name: "Youth Ministry", code: "YOUTH" },
    { name: "Junior Ministry", code: "JUNIOR" },
  ]) {
    await prisma.fellowshipMinistry.upsert({
      where: { code: fellowship.code },
      update: { name: fellowship.name },
      create: fellowship,
    });
  }

  for (const kind of [
    { kind: "Pledge" as const, name: "Pledge", code: "PLEDGE" },
    { kind: "Tithe" as const, name: "Tithe", code: "TITHE" },
    { kind: "Dues" as const, name: "Dues", code: "DUES" },
    {
      kind: "SpecialProject" as const,
      name: "Special Project",
      code: "SPECIAL_PROJECT",
    },
    {
      kind: "Thanksgiving" as const,
      name: "Thanksgiving",
      code: "THANKSGIVING",
    },
  ]) {
    await prisma.obligationType.upsert({
      where: { code: kind.code },
      update: { name: kind.name, kind: kind.kind },
      create: kind,
    });
  }

  for (const demo of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {
        name: demo.name,
        role: demo.role,
        passwordHash,
        isActive: true,
      },
      create: {
        email: demo.email,
        name: demo.name,
        role: demo.role,
        passwordHash,
      },
    });

    if (demo.role === "BranchLeader") {
      await prisma.userBranchScope.upsert({
        where: {
          userId_branchId: { userId: user.id, branchId: eastLegon.id },
        },
        update: {},
        create: { userId: user.id, branchId: eastLegon.id },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      action: "system.seed",
      entityType: "System",
      metadata: {
        message: "Phase A platform seed completed",
        hqBranchId: hq.id,
      },
    },
  });

  console.log("Seed complete.");
  console.log(`Default password for demo users: ${SEED_PASSWORD}`);
  console.log("Demo users:");
  for (const u of demoUsers) {
    console.log(`  - ${u.email} (${u.role})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
