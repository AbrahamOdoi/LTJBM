import {
  PrismaClient,
  type HouseholdRelation,
  type Role,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_SEED_PASSWORD = "ChangeMe123!";
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? DEFAULT_SEED_PASSWORD;

if (
  process.env.NODE_ENV === "production" &&
  SEED_PASSWORD === DEFAULT_SEED_PASSWORD
) {
  throw new Error(
    "Refusing to seed in production with the default demo password. Set SEED_PASSWORD to a strong unique value.",
  );
}

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
  {
    email: "member@ltjbm.local",
    name: "Portal Member",
    role: "Member",
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
    await attachDemoMemberPhotos();
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
        // First 24 members get demo SVG placeholders under public/uploads/members/
        photoKey: i < 24 ? `demo-${String(i + 1).padStart(2, "0")}.svg` : null,
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
  await attachDemoMemberPhotos();
}

/**
 * Attach SVG initials placeholders so the member register shows photos on first page.
 * Re-applies to the first 24 members alphabetically (demo visibility).
 */
async function attachDemoMemberPhotos() {
  const top = await prisma.member.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 24,
    select: { id: true },
  });
  let attached = 0;
  for (let i = 0; i < top.length; i++) {
    const key = `demo-${String(i + 1).padStart(2, "0")}.svg`;
    await prisma.member.update({
      where: { id: top[i]!.id },
      data: { photoKey: key },
    });
    attached += 1;
  }
  if (attached > 0) {
    console.log(`Attached ${attached} demo member photo placeholders (A–Z first page).`);
  }
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
        { value: "Active", label: "Active member", sortOrder: 1 },
        { value: "Visitor", label: "Visitor / first-timer", sortOrder: 2 },
        { value: "Inactive", label: "Inactive", sortOrder: 3 },
        { value: "Transferred", label: "Transferred", sortOrder: 4 },
        { value: "Suspended", label: "Suspended", sortOrder: 5 },
        { value: "Deceased", label: "Deceased", sortOrder: 6 },
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

async function seedGroupsHub(opts: {
  hqId: string;
  eastId: string;
  actorId: string;
  sampleMemberId: string;
}) {
  // Backfill hub rows for every Cell / FellowshipMinistry
  const cells = await prisma.cell.findMany({ include: { ministryGroup: true } });
  for (const cell of cells) {
    if (cell.ministryGroup) continue;
    await prisma.ministryGroup.create({
      data: {
        name: cell.name,
        kind: "Cell",
        branchId: cell.branchId,
        cellId: cell.id,
      },
    });
  }

  const fellowships = await prisma.fellowshipMinistry.findMany({
    include: { ministryGroup: true },
  });
  for (const f of fellowships) {
    if (f.ministryGroup) continue;
    const kind =
      f.code === "YOUTH" || /youth/i.test(f.name) ? "Youth" : "Fellowship";
    await prisma.ministryGroup.create({
      data: {
        name: f.name,
        kind,
        description: f.description,
        fellowshipMinistryId: f.id,
      },
    });
  }

  // Choir + ushers as first-class kinds (not Cell/Fellowship)
  let choir = await prisma.ministryGroup.findFirst({
    where: { kind: "Choir", name: "HQ Mass Choir" },
  });
  if (!choir) {
    choir = await prisma.ministryGroup.create({
      data: {
        name: "HQ Mass Choir",
        kind: "Choir",
        branchId: opts.hqId,
        description: "Head Office mass choir — demo department.",
      },
    });
  }

  let ushers = await prisma.ministryGroup.findFirst({
    where: { kind: "Usher", name: "East Legon Ushers" },
  });
  if (!ushers) {
    ushers = await prisma.ministryGroup.create({
      data: {
        name: "East Legon Ushers",
        kind: "Usher",
        branchId: opts.eastId,
        description: "Sunday service ushering team.",
      },
    });
  }

  // Copy open GroupMembership rows onto linked hub rosters
  const linked = await prisma.ministryGroup.findMany({
    where: {
      OR: [
        { cellId: { not: null } },
        { fellowshipMinistryId: { not: null } },
      ],
    },
  });
  for (const g of linked) {
    const memberships = await prisma.groupMembership.findMany({
      where: {
        endedAt: null,
        OR: [
          ...(g.cellId ? [{ kind: "Cell" as const, cellId: g.cellId }] : []),
          ...(g.fellowshipMinistryId
            ? [
                {
                  kind: "Fellowship" as const,
                  fellowshipMinistryId: g.fellowshipMinistryId,
                },
              ]
            : []),
        ],
      },
      take: 40,
    });
    for (const m of memberships) {
      const open = await prisma.groupRosterEntry.findFirst({
        where: { groupId: g.id, memberId: m.memberId, endedAt: null },
      });
      if (!open) {
        await prisma.groupRosterEntry.create({
          data: {
            groupId: g.id,
            memberId: m.memberId,
            startedAt: m.startedAt,
          },
        });
      }
    }
  }

  // Demo roster + leader + meeting + announcement on choir
  const onChoir = await prisma.groupRosterEntry.findFirst({
    where: {
      groupId: choir.id,
      memberId: opts.sampleMemberId,
      endedAt: null,
    },
  });
  if (!onChoir) {
    await prisma.groupRosterEntry.create({
      data: { groupId: choir.id, memberId: opts.sampleMemberId },
    });
  }

  const choirLeader = await prisma.groupLeader.findFirst({
    where: {
      groupId: choir.id,
      memberId: opts.sampleMemberId,
      endedAt: null,
    },
  });
  if (!choirLeader) {
    await prisma.groupLeader.create({
      data: {
        groupId: choir.id,
        memberId: opts.sampleMemberId,
        title: "Choir director",
      },
    });
  }

  const meetingCount = await prisma.groupMeetingLog.count({
    where: { groupId: choir.id },
  });
  if (meetingCount === 0) {
    await prisma.groupMeetingLog.create({
      data: {
        groupId: choir.id,
        heldAt: new Date(),
        title: "Saturday rehearsal",
        notes: "Demo meeting log — Phase E groups hub.",
        attendanceCount: 18,
        location: "HQ choir room",
        recordedById: opts.actorId,
      },
    });
  }

  const announceCount = await prisma.groupAnnouncement.count({
    where: { groupId: choir.id },
  });
  if (announceCount === 0) {
    await prisma.groupAnnouncement.create({
      data: {
        groupId: choir.id,
        title: "Rehearsal reminder",
        body: "Please arrive by 4pm for Saturday rehearsal. Stub announcement — no live WhatsApp.",
        channel: "Email",
        outboxLogged: false,
        createdById: opts.actorId,
      },
    });
  }

  console.log(
    `Groups hub: ${await prisma.ministryGroup.count()} groups (choir/ushers + synced cells/fellowships).`,
  );
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

  // Members-owned ≥100 biodata seed
  await seedMembers();
  await seedDomainLists();

  // ── Finance demo slice (minimal FIN-* members; full biodata is Members-owned)
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

  // ── Reporting: Board template + monthly schedule (Reporting-owned)
  const boardLayout = {
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

  let boardTemplate = await prisma.reportTemplate.findFirst({
    where: { name: "Board monthly rollup" },
  });
  if (boardTemplate) {
    boardTemplate = await prisma.reportTemplate.update({
      where: { id: boardTemplate.id },
      data: {
        description:
          "Default Pastoral Board / Leadership Council Expected·Paid·Outstanding template",
        layout: boardLayout,
        isActive: true,
      },
    });
  } else {
    boardTemplate = await prisma.reportTemplate.create({
      data: {
        name: "Board monthly rollup",
        description:
          "Default Pastoral Board / Leadership Council Expected·Paid·Outstanding template",
        layout: boardLayout,
        isActive: true,
      },
    });
  }

  const existingSchedule = await prisma.reportSchedule.findFirst({
    where: { reportTemplateId: boardTemplate.id },
  });
  if (!existingSchedule) {
    await prisma.reportSchedule.create({
      data: {
        reportTemplateId: boardTemplate.id,
        cronExpression: "0 8 1 * *",
        distributionList: ["board@ltjbm.local", "council@ltjbm.local"],
        isActive: true,
      },
    });
  }

  // ── Phase D Must-next demo slice
  const portalMember = financeMembers[0]!;
  await prisma.member.update({
    where: { id: portalMember.id },
    data: {
      joinedAt: new Date("2019-06-15T00:00:00.000Z"),
      baptismDate: new Date("2018-03-25T00:00:00.000Z"),
      confirmationDate: new Date("2018-12-02T00:00:00.000Z"),
    },
  });
  await prisma.user.update({
    where: { email: "member@ltjbm.local" },
    data: { memberId: portalMember.id, name: `${portalMember.firstName} ${portalMember.lastName}` },
  });

  const visitor = await prisma.member.upsert({
    where: { memberNumber: "VIS-001" },
    update: { status: "Visitor", firstName: "Efua", lastName: "Firstimer" },
    create: {
      memberNumber: "VIS-001",
      firstName: "Efua",
      lastName: "Firstimer",
      phone: "+233209990001",
      status: "Visitor",
      joinedAt: new Date(),
      branchId: eastLegon.id,
      country: "Ghana",
    },
  });
  const clerk = await prisma.user.findUniqueOrThrow({
    where: { email: "clerk@ltjbm.local" },
  });
  const existingFollowUp = await prisma.visitorFollowUp.findFirst({
    where: { memberId: visitor.id, status: { in: ["Open", "InProgress"] } },
  });
  if (!existingFollowUp) {
    await prisma.visitorFollowUp.create({
      data: {
        memberId: visitor.id,
        status: "Open",
        firstVisitOn: new Date(),
        nextActionOn: new Date(Date.now() + 3 * 86400000),
        notes: "Welcome call — invite to cell",
        createdById: clerk.id,
        assignedToId: clerk.id,
      },
    });
  }

  const firstTimerTag = await prisma.tag.upsert({
    where: { name: "First-timer" },
    update: {},
    create: { name: "First-timer", color: "#0ea5e9" },
  });
  await prisma.memberTag.upsert({
    where: {
      memberId_tagId: { memberId: visitor.id, tagId: firstTimerTag.id },
    },
    update: {},
    create: { memberId: visitor.id, tagId: firstTimerTag.id },
  });
  await prisma.memberMilestone.createMany({
    data: [
      {
        memberId: portalMember.id,
        kind: "Baptism",
        occurredOn: new Date("2018-03-25T00:00:00.000Z"),
        title: "Baptised at HQ Accra",
      },
    ],
    skipDuplicates: true,
  });

  const attCount = await prisma.attendanceSession.count();
  if (attCount === 0) {
    const att = await prisma.attendanceSession.create({
      data: {
        kind: "Service",
        label: "Sunday worship (demo)",
        heldAt: new Date(),
        branchId: eastLegon.id,
        headcount: 86,
        checkInToken: "demo-checkin-token-sunday",
        kioskEnabled: true,
      },
    });
    await prisma.attendanceRecord.create({
      data: {
        sessionId: att.id,
        memberId: portalMember.id,
        present: true,
        markedById: clerk.id,
        source: "Manual",
      },
    });
  } else {
    const untokensed = await prisma.attendanceSession.findMany({
      where: { checkInToken: null },
      select: { id: true },
      take: 20,
    });
    for (const [i, row] of untokensed.entries()) {
      await prisma.attendanceSession.update({
        where: { id: row.id },
        data: {
          checkInToken: `demo-checkin-token-${i + 1}`,
          kioskEnabled: true,
        },
      });
    }
  }

  const roomCount = await prisma.facilityRoom.count();
  if (roomCount === 0) {
    const sanctuary = await prisma.facilityRoom.create({
      data: {
        name: "Main sanctuary",
        code: "SANCT",
        branchId: hq.id,
        capacity: 400,
        location: "Ground floor",
      },
    });
    await prisma.facilityRoom.create({
      data: {
        name: "Youth hall",
        code: "YOUTH",
        branchId: eastLegon.id,
        capacity: 80,
        location: "First floor",
      },
    });
    const starts = new Date(Date.now() + 3 * 86400000);
    starts.setUTCHours(9, 0, 0, 0);
    const ends = new Date(starts.getTime() + 3 * 3600000);
    await prisma.roomBooking.create({
      data: {
        roomId: sanctuary.id,
        title: "Sunday service (demo booking)",
        startsAt: starts,
        endsAt: ends,
        bookedBy: "Data Centre",
      },
    });
  }

  const cfCount = await prisma.customFieldDefinition.count();
  if (cfCount === 0) {
    const lang = await prisma.customFieldDefinition.create({
      data: {
        key: "preferred_language",
        label: "Preferred language",
        fieldType: "Select",
        optionsJson: ["English", "Twi", "Ga", "Ewe"],
        helpText: "Language for pastoral follow-up",
        sortOrder: 10,
      },
    });
    await prisma.customFieldDefinition.create({
      data: {
        key: "allergies_notes",
        label: "Allergies / medical notes",
        fieldType: "TextArea",
        helpText: "Optional — for hospitality / first aid awareness",
        sortOrder: 20,
      },
    });
    await prisma.memberCustomFieldValue.create({
      data: {
        memberId: portalMember.id,
        fieldId: lang.id,
        valueText: "English",
      },
    });
  }

  const eventCount = await prisma.churchEvent.count();
  if (eventCount === 0) {
    await prisma.churchEvent.create({
      data: {
        title: "Youth convention",
        description: "Annual youth gathering — demo calendar event.",
        startsAt: new Date(Date.now() + 14 * 86400000),
        location: "HQ Accra auditorium",
        branchId: hq.id,
        capacity: 200,
      },
    });
  }

  const pastoralCount = await prisma.pastoralCareNote.count();
  if (pastoralCount === 0) {
    const boardUser = await prisma.user.findUniqueOrThrow({
      where: { email: "board@ltjbm.local" },
    });
    await prisma.pastoralCareNote.create({
      data: {
        kind: "Prayer",
        title: "Family healing",
        body: "Please keep the Mensah family in prayer (demo note — restricted).",
        memberId: portalMember.id,
        authorId: boardUser.id,
        isPrivate: true,
      },
    });
  }

  for (const ch of [
    { kind: "Email" as const, label: "Email (SMTP)" },
    { kind: "Sms" as const, label: "SMS" },
    { kind: "WhatsApp" as const, label: "WhatsApp" },
    { kind: "Push" as const, label: "Push notifications" },
  ]) {
    await prisma.communicationChannel.upsert({
      where: { kind: ch.kind },
      update: {},
      create: {
        kind: ch.kind,
        label: ch.label,
        isEnabled: false,
        notes: "Stub until provider credentials are configured.",
      },
    });
  }

  // Phase E — groups & ministries hub (cells/fellowships + choir/ushers)
  await seedGroupsHub({
    hqId: hq.id,
    eastId: eastLegon.id,
    actorId: clerk.id,
    sampleMemberId: portalMember.id,
  });

  await prisma.auditLog.create({
    data: {
      action: "system.seed",
      entityType: "System",
      metadata: {
        message:
          "Platform + members + finance + reporting + admin + Phase D + Phase E groups seed completed",
        hqBranchId: hq.id,
        financeDemoMembers: financeMembers.map((m) => m.memberNumber),
        boardTemplateId: boardTemplate.id,
        portalMemberNumber: portalMember.memberNumber,
      },
    },
  });

  const memberCount = await prisma.member.count();
  console.log("Seed complete.");
  console.log(`Member count: ${memberCount}`);
  if (SEED_PASSWORD === DEFAULT_SEED_PASSWORD) {
    console.log(
      "Demo password: ChangeMe123! (LOCAL DEMO ONLY — override with SEED_PASSWORD; never reuse in staging/production)",
    );
  } else {
    console.log("Demo password: (from SEED_PASSWORD env)");
  }
  console.log("Demo users:");
  for (const u of demoUsers) {
    console.log(`  - ${u.email} (${u.role})`);
  }
  console.log("Finance demo members: FIN-001, FIN-002, FIN-003");
  console.log("Portal: member@ltjbm.local → FIN-001");
  console.log(`Board report template: ${boardTemplate.name} (${boardTemplate.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
