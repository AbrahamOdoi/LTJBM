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

  // ── Finance demo slice (minimal members; full ≥100 biodata is Members-owned)
  const cell = await prisma.cell.upsert({
    where: { branchId_name: { branchId: eastLegon.id, name: "Cell A" } },
    update: {},
    create: { name: "Cell A", branchId: eastLegon.id },
  });

  const mens = await prisma.fellowshipMinistry.findUniqueOrThrow({
    where: { code: "MEN" },
  });
  const types = Object.fromEntries(
    (
      await prisma.obligationType.findMany({
        where: {
          code: {
            in: ["PLEDGE", "TITHE", "DUES", "SPECIAL_PROJECT", "THANKSGIVING"],
          },
        },
      })
    ).map((t) => [t.code, t]),
  );

  const memberSpecs = [
    {
      memberNumber: "FIN-001",
      firstName: "Kwame",
      lastName: "Mensah",
      phone: "+233201111001",
    },
    {
      memberNumber: "FIN-002",
      firstName: "Ama",
      lastName: "Owusu",
      phone: "+233201111002",
    },
    {
      memberNumber: "FIN-003",
      firstName: "Kojo",
      lastName: "Asante",
      phone: "+233201111003",
    },
  ] as const;

  const financeMembers = [];
  for (const spec of memberSpecs) {
    const member = await prisma.member.upsert({
      where: { memberNumber: spec.memberNumber },
      update: {
        firstName: spec.firstName,
        lastName: spec.lastName,
        phone: spec.phone,
        branchId: eastLegon.id,
        status: "Active",
      },
      create: {
        memberNumber: spec.memberNumber,
        firstName: spec.firstName,
        lastName: spec.lastName,
        phone: spec.phone,
        country: "Ghana",
        branchId: eastLegon.id,
        status: "Active",
      },
    });
    financeMembers.push(member);

    const existingGroups = await prisma.groupMembership.count({
      where: { memberId: member.id, endedAt: null },
    });
    if (existingGroups === 0) {
      await prisma.groupMembership.createMany({
        data: [
          { memberId: member.id, kind: "Cell", cellId: cell.id },
          {
            memberId: member.id,
            kind: "Fellowship",
            fellowshipMinistryId: mens.id,
          },
        ],
      });
    }
  }

  const [kwame, ama, kojo] = financeMembers;
  const periodStart = new Date("2026-01-01T00:00:00.000Z");
  const saturday = new Date("2026-11-01T00:00:00.000Z");

  // Idempotent finance demo: wipe prior demo obligations for these members
  await prisma.payment.deleteMany({
    where: { obligation: { memberId: { in: financeMembers.map((m) => m.id) } } },
  });
  await prisma.obligation.deleteMany({
    where: { memberId: { in: financeMembers.map((m) => m.id) } },
  });
  await prisma.collectionBatch.deleteMany({
    where: { label: "Saturday collection (seed demo)" },
  });

  const pledge = await prisma.obligation.create({
    data: {
      memberId: kwame.id,
      obligationTypeId: types.PLEDGE.id,
      periodStart,
      periodEnd: new Date("2026-12-31T00:00:00.000Z"),
      expectedAmount: 1200,
      instalmentCount: 3,
      notes: "Seed: pledge with instalment plan",
    },
  });
  await prisma.payment.createMany({
    data: [
      {
        obligationId: pledge.id,
        amount: 400,
        paidAt: new Date("2026-02-01T00:00:00.000Z"),
        method: "MoMo",
        reference: "PLEDGE-1",
      },
      {
        obligationId: pledge.id,
        amount: 400,
        paidAt: new Date("2026-03-01T00:00:00.000Z"),
        method: "MoMo",
        reference: "PLEDGE-2",
      },
    ],
  });

  const special = await prisma.obligation.create({
    data: {
      memberId: ama.id,
      obligationTypeId: types.SPECIAL_PROJECT.id,
      fellowshipMinistryId: mens.id,
      periodStart,
      expectedAmount: 500,
      projectTargetAmount: 25000,
      notes: "Seed: special project with overall target",
    },
  });
  await prisma.payment.createMany({
    data: [
      {
        obligationId: special.id,
        amount: 200,
        paidAt: new Date("2026-04-01T00:00:00.000Z"),
        method: "Cash",
        reference: "SP-1",
      },
      {
        obligationId: special.id,
        amount: 150,
        paidAt: new Date("2026-05-01T00:00:00.000Z"),
        method: "Bank",
        reference: "SP-2",
      },
    ],
  });

  const tithe = await prisma.obligation.create({
    data: {
      memberId: kwame.id,
      obligationTypeId: types.TITHE.id,
      periodStart: saturday,
      expectedAmount: 150,
    },
  });
  const thanksgiving = await prisma.obligation.create({
    data: {
      memberId: ama.id,
      obligationTypeId: types.THANKSGIVING.id,
      periodStart: saturday,
      expectedAmount: 100,
    },
  });
  const duesPaid = await prisma.obligation.create({
    data: {
      memberId: kojo.id,
      obligationTypeId: types.DUES.id,
      periodStart: saturday,
      expectedAmount: 50,
    },
  });
  const duesArrears = await prisma.obligation.create({
    data: {
      memberId: ama.id,
      obligationTypeId: types.DUES.id,
      periodStart: new Date("2026-10-01T00:00:00.000Z"),
      expectedAmount: 50,
      notes: "Seed: dues arrears",
    },
  });

  const batch = await prisma.collectionBatch.create({
    data: {
      batchDate: saturday,
      label: "Saturday collection (seed demo)",
      countedTotal: 320,
      systemTotal: 0,
      varianceAmount: 0,
      hasVariance: false,
      notes: "Seed Saturday batch for tithe + thanksgiving + dues",
    },
  });

  await prisma.payment.createMany({
    data: [
      {
        obligationId: tithe.id,
        batchId: batch.id,
        amount: 150,
        paidAt: saturday,
        method: "Cash",
      },
      {
        obligationId: thanksgiving.id,
        batchId: batch.id,
        amount: 100,
        paidAt: saturday,
        method: "Cash",
      },
      {
        obligationId: duesPaid.id,
        batchId: batch.id,
        amount: 50,
        paidAt: saturday,
        method: "Cash",
      },
    ],
  });

  // counted 320 vs system 300 → variance flagged
  await prisma.collectionBatch.update({
    where: { id: batch.id },
    data: {
      systemTotal: 300,
      varianceAmount: 20,
      hasVariance: true,
    },
  });

  // Keep duesArrears with zero payments for arrears query
  void duesArrears;

  await prisma.auditLog.create({
    data: {
      action: "system.seed",
      entityType: "System",
      metadata: {
        message: "Phase A platform + finance seed completed",
        hqBranchId: hq.id,
        financeDemoMembers: financeMembers.map((m) => m.memberNumber),
      },
    },
  });

  console.log("Seed complete.");
  console.log(`Default password for demo users: ${SEED_PASSWORD}`);
  console.log("Demo users:");
  for (const u of demoUsers) {
    console.log(`  - ${u.email} (${u.role})`);
  }
  console.log("Finance demo members: FIN-001, FIN-002, FIN-003");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
