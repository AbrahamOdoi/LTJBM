import {
  ObligationKind,
  Prisma,
  type GroupKind,
} from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  computeObligationBalances,
  isInArrears,
  rollupByKind,
  withBalances,
} from "@/lib/finance/balances";
import { computeBatchTotals } from "@/lib/finance/batches";
import { decimalFromNumber, toMoneyNumber } from "@/lib/finance/money";
import {
  serializeBatch,
  serializeObligation,
  serializePayment,
} from "@/lib/finance/serializers";
import { pageResult, type PageResult } from "@/lib/data-table";

const obligationInclude = {
  obligationType: true,
  member: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      memberNumber: true,
    },
  },
  fellowshipMinistry: {
    select: { id: true, name: true, code: true },
  },
  payments: { orderBy: { paidAt: "asc" as const } },
} satisfies Prisma.ObligationInclude;

export async function listObligationTypes() {
  return prisma.obligationType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function listFinanceMembers(q?: string) {
  return prisma.member.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { memberNumber: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      memberNumber: true,
      branchId: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 100,
  });
}

export type CreateObligationInput = {
  memberId: string;
  obligationTypeId: string;
  fellowshipMinistryId?: string | null;
  periodStart: Date;
  periodEnd?: Date | null;
  expectedAmount: number;
  currency?: string;
  instalmentCount?: number | null;
  projectTargetAmount?: number | null;
  notes?: string | null;
  actorId: string;
};

export async function createObligation(input: CreateObligationInput) {
  const type = await prisma.obligationType.findUniqueOrThrow({
    where: { id: input.obligationTypeId },
  });

  if (type.kind === ObligationKind.Pledge && !input.instalmentCount) {
    throw new FinanceValidationError(
      "Pledge obligations require instalmentCount.",
    );
  }
  if (type.kind === ObligationKind.SpecialProject && input.projectTargetAmount == null) {
    throw new FinanceValidationError(
      "Special Project obligations require projectTargetAmount.",
    );
  }

  const expectedAmount =
    type.kind === ObligationKind.SpecialProject &&
    input.expectedAmount <= 0 &&
    input.projectTargetAmount != null
      ? input.projectTargetAmount
      : input.expectedAmount;

  if (expectedAmount < 0) {
    throw new FinanceValidationError("expectedAmount cannot be negative.");
  }

  const obligation = await prisma.$transaction(async (tx) => {
    const created = await tx.obligation.create({
      data: {
        memberId: input.memberId,
        obligationTypeId: input.obligationTypeId,
        fellowshipMinistryId: input.fellowshipMinistryId ?? null,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd ?? null,
        expectedAmount: decimalFromNumber(expectedAmount),
        currency: input.currency ?? "GHS",
        instalmentCount: input.instalmentCount ?? null,
        projectTargetAmount:
          input.projectTargetAmount == null
            ? null
            : decimalFromNumber(input.projectTargetAmount),
        notes: input.notes ?? null,
      },
      include: obligationInclude,
    });

    await writeAuditLog(
      {
        actorId: input.actorId,
        action: "finance.obligation.create",
        entityType: "Obligation",
        entityId: created.id,
        metadata: {
          kind: type.kind,
          expectedAmount,
          memberId: input.memberId,
        },
      },
      tx,
    );

    return created;
  });

  return serializeObligation(obligation);
}

export async function listObligations(filters: {
  kind?: ObligationKind;
  memberId?: string;
  q?: string;
  periodStart?: Date;
  periodEnd?: Date;
  page?: number;
  pageSize?: number;
}): Promise<PageResult<ReturnType<typeof serializeObligation>>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 25;
  const q = filters.q?.trim();

  const where: Prisma.ObligationWhereInput = {
    memberId: filters.memberId,
    obligationType: filters.kind ? { kind: filters.kind } : undefined,
    ...(filters.periodStart || filters.periodEnd
      ? {
          periodStart: {
            ...(filters.periodStart ? { gte: filters.periodStart } : {}),
            ...(filters.periodEnd ? { lte: filters.periodEnd } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            {
              member: {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                  { memberNumber: { contains: q, mode: "insensitive" } },
                ],
              },
            },
            {
              obligationType: {
                name: { contains: q, mode: "insensitive" },
              },
            },
            { notes: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.obligation.findMany({
      where,
      include: obligationInclude,
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.obligation.count({ where }),
  ]);

  return pageResult(rows.map(serializeObligation), total, page, pageSize);
}

export async function getObligation(id: string) {
  const obligation = await prisma.obligation.findUnique({
    where: { id },
    include: obligationInclude,
  });
  if (!obligation) return null;
  return serializeObligation(obligation);
}

export type CreatePaymentInput = {
  obligationId: string;
  amount: number;
  paidAt: Date;
  method?: string | null;
  reference?: string | null;
  notes?: string | null;
  batchId?: string | null;
  /** Null for system/webhook posts (online giving). */
  actorId: string | null;
  /** Online giving completes receipt itself — avoid double-send. */
  skipReceiptAutomation?: boolean;
};

export async function createPayment(input: CreatePaymentInput) {
  if (input.amount <= 0) {
    throw new FinanceValidationError("Payment amount must be positive.");
  }

  const payment = await prisma.$transaction(async (tx) => {
    const obligation = await tx.obligation.findUnique({
      where: { id: input.obligationId },
      include: { payments: true, obligationType: true },
    });
    if (!obligation) {
      throw new FinanceValidationError("Obligation not found.", 404);
    }

    if (input.batchId) {
      const batch = await tx.collectionBatch.findUnique({
        where: { id: input.batchId },
      });
      if (!batch) {
        throw new FinanceValidationError("Collection batch not found.", 404);
      }
    }

    const created = await tx.payment.create({
      data: {
        obligationId: input.obligationId,
        amount: decimalFromNumber(input.amount),
        paidAt: input.paidAt,
        method: input.method ?? null,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        batchId: input.batchId ?? null,
      },
    });

    if (input.batchId) {
      await recalculateBatchTotals(input.batchId, tx);
    }

    const balances = computeObligationBalances({
      expectedAmount: obligation.expectedAmount,
      payments: [...obligation.payments, created],
    });

    await writeAuditLog(
      {
        actorId: input.actorId,
        action: "finance.payment.create",
        entityType: "Payment",
        entityId: created.id,
        metadata: {
          obligationId: input.obligationId,
          amount: input.amount,
          kind: obligation.obligationType.kind,
          balances,
          batchId: input.batchId ?? null,
        },
      },
      tx,
    );

    return created;
  });

  // Receipt template via outbox (logs clearly when SMTP/SMS credentials absent).
  // Skip when caller will enqueue (online giving completes its own receipt).
  if (!input.skipReceiptAutomation) {
    try {
      const { enqueueReceiptForPayment } = await import(
        "@/lib/comms/automations"
      );
      await enqueueReceiptForPayment(payment.id, input.actorId);
    } catch (err) {
      console.warn("[finance] receipt automation failed:", err);
    }
  }

  return serializePayment(payment);
}

export type CreateBatchInput = {
  batchDate: Date;
  label: string;
  countedTotal: number;
  notes?: string | null;
  actorId: string;
};

export async function createCollectionBatch(input: CreateBatchInput) {
  if (input.countedTotal < 0) {
    throw new FinanceValidationError("countedTotal cannot be negative.");
  }

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.collectionBatch.create({
      data: {
        batchDate: input.batchDate,
        label: input.label,
        countedTotal: decimalFromNumber(input.countedTotal),
        systemTotal: decimalFromNumber(0),
        varianceAmount: decimalFromNumber(input.countedTotal),
        hasVariance: input.countedTotal >= 0.01,
        notes: input.notes ?? null,
      },
      include: { payments: true },
    });

    await writeAuditLog(
      {
        actorId: input.actorId,
        action: "finance.batch.create",
        entityType: "CollectionBatch",
        entityId: created.id,
        metadata: {
          label: input.label,
          countedTotal: input.countedTotal,
        },
      },
      tx,
    );

    return created;
  });

  return serializeBatch(batch);
}

export async function listCollectionBatches(filters?: {
  q?: string;
  variance?: "open" | "balanced" | string;
  page?: number;
  pageSize?: number;
}): Promise<PageResult<ReturnType<typeof serializeBatch>>> {
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = filters?.pageSize ?? 25;
  const q = filters?.q?.trim();
  const variance = filters?.variance;

  const where: Prisma.CollectionBatchWhereInput = {
    ...(variance === "open"
      ? { hasVariance: true }
      : variance === "balanced"
        ? { hasVariance: false }
        : {}),
    ...(q
      ? {
          OR: [
            { label: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.collectionBatch.findMany({
      where,
      include: { payments: true },
      orderBy: { batchDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.collectionBatch.count({ where }),
  ]);

  return pageResult(rows.map(serializeBatch), total, page, pageSize);
}

export async function getCollectionBatch(id: string) {
  const batch = await prisma.collectionBatch.findUnique({
    where: { id },
    include: {
      payments: {
        include: {
          obligation: {
            include: {
              obligationType: true,
              member: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  memberNumber: true,
                },
              },
            },
          },
        },
        orderBy: { paidAt: "asc" },
      },
    },
  });
  if (!batch) return null;

  const serialized = serializeBatch(batch);
  return {
    ...serialized,
    payments: batch.payments.map((p) => ({
      ...serializePayment(p),
      obligation: {
        id: p.obligation.id,
        kind: p.obligation.obligationType.kind,
        typeName: p.obligation.obligationType.name,
        member: {
          id: p.obligation.member.id,
          name: `${p.obligation.member.firstName} ${p.obligation.member.lastName}`,
          memberNumber: p.obligation.member.memberNumber,
        },
      },
    })),
  };
}

export async function updateCollectionBatch(
  id: string,
  input: {
    countedTotal?: number;
    label?: string;
    notes?: string | null;
    actorId: string;
  },
) {
  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.collectionBatch.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!existing) {
      throw new FinanceValidationError("Collection batch not found.", 404);
    }

    const countedTotal =
      input.countedTotal != null
        ? input.countedTotal
        : toMoneyNumber(existing.countedTotal);

    const totals = computeBatchTotals({
      countedTotal,
      payments: existing.payments,
    });

    const batch = await tx.collectionBatch.update({
      where: { id },
      data: {
        label: input.label ?? existing.label,
        notes: input.notes === undefined ? existing.notes : input.notes,
        countedTotal: decimalFromNumber(totals.countedTotal),
        systemTotal: decimalFromNumber(totals.systemTotal),
        varianceAmount: decimalFromNumber(totals.varianceAmount),
        hasVariance: totals.hasVariance,
      },
      include: { payments: true },
    });

    await writeAuditLog(
      {
        actorId: input.actorId,
        action: "finance.batch.update",
        entityType: "CollectionBatch",
        entityId: id,
        metadata: totals,
      },
      tx,
    );

    return batch;
  });

  return serializeBatch(updated);
}

async function recalculateBatchTotals(
  batchId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const batch = await client.collectionBatch.findUniqueOrThrow({
    where: { id: batchId },
    include: { payments: true },
  });
  const totals = computeBatchTotals(batch);
  return client.collectionBatch.update({
    where: { id: batchId },
    data: {
      systemTotal: decimalFromNumber(totals.systemTotal),
      varianceAmount: decimalFromNumber(totals.varianceAmount),
      hasVariance: totals.hasVariance,
    },
  });
}

export async function listDuesArrears(filters: {
  memberId?: string;
  cellId?: string;
  fellowshipMinistryId?: string;
  groupKind?: GroupKind;
  q?: string;
  periodStart?: Date;
  periodEnd?: Date;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 25;
  const q = filters.q?.trim();

  const memberWhere: Prisma.MemberWhereInput = {
    ...(filters.cellId || filters.fellowshipMinistryId || filters.groupKind
      ? {
          groups: {
            some: {
              endedAt: null,
              kind: filters.groupKind,
              cellId: filters.cellId,
              fellowshipMinistryId: filters.fellowshipMinistryId,
            },
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { memberNumber: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const obligations = await prisma.obligation.findMany({
    where: {
      obligationType: { kind: ObligationKind.Dues },
      memberId: filters.memberId,
      ...(filters.periodStart || filters.periodEnd
        ? {
            periodStart: {
              ...(filters.periodStart ? { gte: filters.periodStart } : {}),
              ...(filters.periodEnd ? { lte: filters.periodEnd } : {}),
            },
          }
        : {}),
      ...(Object.keys(memberWhere).length > 0 ? { member: memberWhere } : {}),
    },
    include: {
      ...obligationInclude,
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          memberNumber: true,
          groups: {
            where: { endedAt: null },
            include: {
              cell: { select: { id: true, name: true } },
              fellowshipMinistry: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
      },
    },
    orderBy: [{ periodStart: "asc" }, { createdAt: "asc" }],
  });

  const all = obligations
    .map((ob) => {
      const balances = computeObligationBalances(ob);
      return {
        ...serializeObligation({
          ...ob,
          member: {
            id: ob.member.id,
            firstName: ob.member.firstName,
            lastName: ob.member.lastName,
            memberNumber: ob.member.memberNumber,
          },
        }),
        groups: ob.member.groups.map((g) => ({
          kind: g.kind,
          cell: g.cell,
          fellowshipMinistry: g.fellowshipMinistry,
        })),
        balances,
        inArrears: isInArrears(balances),
      };
    })
    .filter((row) => row.inArrears);

  const total = all.length;
  const start = (page - 1) * pageSize;
  return pageResult(all.slice(start, start + pageSize), total, page, pageSize);
}

export async function getBalanceRollup(filters: {
  periodStart?: Date;
  periodEnd?: Date;
  kind?: ObligationKind;
}) {
  const obligations = await prisma.obligation.findMany({
    where: {
      obligationType: filters.kind ? { kind: filters.kind } : undefined,
      ...(filters.periodStart || filters.periodEnd
        ? {
            periodStart: {
              ...(filters.periodStart ? { gte: filters.periodStart } : {}),
              ...(filters.periodEnd ? { lte: filters.periodEnd } : {}),
            },
          }
        : {}),
    },
    include: {
      obligationType: true,
      payments: true,
    },
  });

  const byKind = rollupByKind(
    obligations.map((ob) => ({
      id: ob.id,
      expectedAmount: ob.expectedAmount,
      projectTargetAmount: ob.projectTargetAmount,
      instalmentCount: ob.instalmentCount,
      obligationType: ob.obligationType,
      payments: ob.payments,
    })),
  );

  const totals = byKind.reduce(
    (acc, row) => ({
      expected: acc.expected + row.expected,
      paid: acc.paid + row.paid,
      outstanding: acc.outstanding + row.outstanding,
      obligationCount: acc.obligationCount + row.obligationCount,
    }),
    { expected: 0, paid: 0, outstanding: 0, obligationCount: 0 },
  );

  return {
    byKind,
    totals: {
      expected: toMoneyNumber(totals.expected),
      paid: toMoneyNumber(totals.paid),
      outstanding: toMoneyNumber(totals.outstanding),
      obligationCount: totals.obligationCount,
    },
    // Explicit contract for Reporting workstream consumers
    contract: {
      expected: "Sum of Obligation.expectedAmount in filter",
      paid: "Sum of Payment.amount against those obligations",
      outstanding: "expected − paid (negative = overpayment)",
    },
  };
}

export class FinanceValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "FinanceValidationError";
    this.status = status;
  }
}

/** Re-export for UI pages that want balances without serialization. */
export { withBalances, computeObligationBalances };
