import {
  PrismaClient,
  type HouseholdRelation,
  type Role,
} from "@prisma/client";
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

const FIRST_NAMES = [
  "Kwame",
  "Ama",
  "Kofi",
  "Akosua",
  "Yaw",
  "Abena",
  "Kojo",
  "Efua",
  "Kwesi",
  "Adwoa",
  "Fiifi",
  "Afua",
  "Nana",
  "Esi",
  "Kwabena",
  "Akua",
  "Joseph",
  "Grace",
  "Samuel",
  "Ruth",
  "Daniel",
  "Hannah",
  "Emmanuel",
  "Mercy",
  "Isaac",
  "Patience",
  "David",
  "Comfort",
  "Michael",
  "Joyce",
  "Peter",
  "Esther",
  "James",
  "Priscilla",
  "John",
  "Deborah",
  "Francis",
  "Mary",
  "Benjamin",
  "Sarah",
];

const LAST_NAMES = [
  "Mensah",
  "Asante",
  "Owusu",
  "Boateng",
  "Osei",
  "Agyeman",
  "Appiah",
  "Darko",
  "Addo",
  "Nkrumah",
  "Amoah",
  "Sarpong",
  "Tetteh",
  "Quaye",
  "Adjei",
  "Frimpong",
  "Ansah",
  "Ofori",
  "Baffoe",
  "Gyamfi",
];

const REGIONS = ["Greater Accra", "Ashanti", "Eastern", "Central", "Volta"];
const CITIES = ["Accra", "Tema", "Kumasi", "Madina", "Legon", "Kasoa"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!;
}

function phoneFor(i: number) {
  return `+23324${String(1000000 + i).slice(-7)}`;
}

async function seedMembers() {
  const branches = await prisma.branch.findMany();
  const hq = branches.find((b) => b.code === "HQ-ACCRA")!;
  const east = branches.find((b) => b.code === "GH-EAST-LEGON")!;
  const london = branches.find((b) => b.code === "INT-LONDON")!;
  const fellowships = await prisma.fellowshipMinistry.findMany();

  const cellDefs = [
    { branchId: hq.id, name: "HQ Cell Alpha" },
    { branchId: hq.id, name: "HQ Cell Beta" },
    { branchId: east.id, name: "East Legon Cell 1" },
    { branchId: east.id, name: "East Legon Cell 2" },
    { branchId: east.id, name: "East Legon Youth Cell" },
    { branchId: london.id, name: "London Cell North" },
    { branchId: london.id, name: "London Cell South" },
  ];

  const cells = [];
  for (const def of cellDefs) {
    const cell = await prisma.cell.upsert({
      where: { branchId_name: { branchId: def.branchId, name: def.name } },
      update: {},
      create: def,
    });
    cells.push(cell);
  }

  const existingCount = await prisma.member.count();
  if (existingCount >= 100) {
    console.log(`Members already seeded (${existingCount}); skipping biodata bulk.`);
    return;
  }

  const target = 120;
  const branchCycle = [east, hq, east, london, east, hq];
  let created = 0;

  for (let i = 0; i < target; i++) {
    const branch = pick(branchCycle, i);
    const firstName = pick(FIRST_NAMES, i);
    const lastName = pick(LAST_NAMES, i * 3 + 1);
    const gender = i % 2 === 0 ? "Male" : "Female";
    const fellowship = pick(
      fellowships,
      gender === "Male" ? (i % 2 === 0 ? 0 : 2) : i % 3 === 0 ? 3 : 1,
    );
    const branchCells = cells.filter((c) => c.branchId === branch.id);
    const cell = pick(branchCells, i);
    const year = 2024;
    const memberNumber = `${branch.code}-${year}-${String(i + 1).padStart(4, "0")}`;

    const dob = new Date(Date.UTC(1965 + (i % 35), i % 12, (i % 27) + 1));
    const householdName =
      i % 5 === 0 ? `${lastName} Household` : i % 5 === 1 ? `${lastName} Family` : null;
    const relation: HouseholdRelation =
      i % 5 === 0 ? "Head" : i % 5 === 1 ? "Spouse" : "Other";

    const member = await prisma.member.create({
      data: {
        memberNumber,
        firstName,
        lastName,
        otherNames: i % 7 === 0 ? "Nana" : null,
        dateOfBirth: dob,
        gender,
        phone: phoneFor(i),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.ltjbm.local`,
        addressLine1: `${10 + (i % 80)} Faith Avenue`,
        city: branch.isInternational ? "London" : pick(CITIES, i),
        region: branch.isInternational ? "England" : pick(REGIONS, i),
        country: branch.country,
        status: i % 37 === 0 ? "Inactive" : "Active",
        branchId: branch.id,
      },
    });

    await prisma.groupMembership.create({
      data: { memberId: member.id, kind: "Cell", cellId: cell.id },
    });
    await prisma.groupMembership.create({
      data: {
        memberId: member.id,
        kind: "Fellowship",
        fellowshipMinistryId: fellowship.id,
      },
    });

    if (householdName) {
      const household = await prisma.household.create({
        data: { name: householdName },
      });
      await prisma.householdMember.create({
        data: {
          householdId: household.id,
          memberId: member.id,
          relation,
        },
      });

      // Pair spouse into same household for a subset.
      if (relation === "Head" && i + 1 < target) {
        // spouse created on next iteration separately; link later via index map if needed
      }
    }

    await prisma.memberStatusHistory.create({
      data: {
        memberId: member.id,
        fromStatus: null,
        toStatus: "Active",
        toBranchId: branch.id,
        reason: "Seed registration",
      },
    });

    created += 1;
  }

  // Link a few household pairs (Head + Spouse).
  const heads = await prisma.householdMember.findMany({
    where: { relation: "Head" },
    take: 20,
    include: { household: true, member: true },
  });
  for (let i = 0; i < Math.min(15, heads.length); i++) {
    const head = heads[i]!;
    const spouse = await prisma.member.findFirst({
      where: {
        id: { not: head.memberId },
        lastName: head.member.lastName,
        households: { none: {} },
        branchId: head.member.branchId,
      },
    });
    if (!spouse) continue;
    await prisma.householdMember.create({
      data: {
        householdId: head.householdId,
        memberId: spouse.id,
        relation: "Spouse",
      },
    });
  }

  // One intentional near-duplicate pending candidate for demo review UI.
  const sample = await prisma.member.findFirst({
    where: { branchId: east.id, status: "Active" },
    orderBy: { memberNumber: "asc" },
  });
  if (sample) {
    const dup = await prisma.member.create({
      data: {
        memberNumber: `${east.code}-2024-DUPL`,
        firstName: sample.firstName,
        lastName: sample.lastName,
        dateOfBirth: sample.dateOfBirth,
        phone: sample.phone,
        gender: sample.gender,
        city: sample.city,
        country: sample.country,
        status: "Active",
        branchId: east.id,
      },
    });
    await prisma.duplicateCandidate.create({
      data: {
        memberAId: sample.id < dup.id ? sample.id : dup.id,
        memberBId: sample.id < dup.id ? dup.id : sample.id,
        score: 1,
        reasons: [
          "Exact phone match",
          "Exact name match",
          "Name + date of birth match",
        ],
        status: "Pending",
      },
    });
    created += 1;
  }

  console.log(`Seeded ${created} members (total biodata demo ≥100).`);
}

async function seedDomainLists() {
  const domains: Array<{
    key: string;
    label: string;
    description: string;
    values: Array<{
      value: string;
      label: string;
      sortOrder: number;
      parentValue?: string;
    }>;
  }> = [
    {
      key: "gender",
      label: "Gender",
      description: "Member biodata gender dropdown",
      values: [
        { value: "Male", label: "Male", sortOrder: 1 },
        { value: "Female", label: "Female", sortOrder: 2 },
        { value: "Other", label: "Other / prefer not to say", sortOrder: 3 },
      ],
    },
    {
      key: "member_status",
      label: "Member status",
      description: "Status labels for data-entry portal",
      values: [
        { value: "Active", label: "Active", sortOrder: 1 },
        { value: "Inactive", label: "Inactive", sortOrder: 2 },
        { value: "Transferred", label: "Transferred", sortOrder: 3 },
        { value: "Suspended", label: "Suspended", sortOrder: 4 },
        { value: "Deceased", label: "Deceased", sortOrder: 5 },
      ],
    },
    {
      key: "payment_method",
      label: "Payment method",
      description: "HQ finance entry methods (portal dropdown)",
      values: [
        { value: "Cash", label: "Cash", sortOrder: 1 },
        { value: "MobileMoney", label: "Mobile Money", sortOrder: 2 },
        { value: "BankTransfer", label: "Bank transfer", sortOrder: 3 },
        { value: "Cheque", label: "Cheque", sortOrder: 4 },
      ],
    },
    {
      key: "ghana_region",
      label: "Ghana regions",
      description: "Location dropdown with example subdomain districts",
      values: [
        { value: "GreaterAccra", label: "Greater Accra", sortOrder: 1 },
        { value: "Ashanti", label: "Ashanti", sortOrder: 2 },
        { value: "Eastern", label: "Eastern", sortOrder: 3 },
        {
          value: "AccraMetro",
          label: "Accra Metro",
          sortOrder: 10,
          parentValue: "GreaterAccra",
        },
        {
          value: "Tema",
          label: "Tema",
          sortOrder: 11,
          parentValue: "GreaterAccra",
        },
        {
          value: "KumasiMetro",
          label: "Kumasi Metro",
          sortOrder: 20,
          parentValue: "Ashanti",
        },
      ],
    },
  ];

  for (const domain of domains) {
    const list = await prisma.domainList.upsert({
      where: { key: domain.key },
      update: { label: domain.label, description: domain.description },
      create: {
        key: domain.key,
        label: domain.label,
        description: domain.description,
      },
    });

    for (const v of domain.values) {
      await prisma.domainListValue.upsert({
        where: {
          domainListId_value: { domainListId: list.id, value: v.value },
        },
        update: {
          label: v.label,
          sortOrder: v.sortOrder,
          parentValue: v.parentValue ?? null,
          isActive: true,
        },
        create: {
          domainListId: list.id,
          value: v.value,
          label: v.label,
          sortOrder: v.sortOrder,
          parentValue: v.parentValue ?? null,
        },
      });
    }
  }

  console.log(`Seeded ${domains.length} admin domain lists.`);
}

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

  await seedMembers();
  await seedDomainLists();

  await prisma.auditLog.create({
    data: {
      action: "system.seed",
      entityType: "System",
      metadata: {
        message:
          "Phase A platform + members biodata + admin domains seed completed",
        hqBranchId: hq.id,
      },
    },
  });

  const memberCount = await prisma.member.count();
  console.log("Seed complete.");
  console.log(`Member count: ${memberCount}`);
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
