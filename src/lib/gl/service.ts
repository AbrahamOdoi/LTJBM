import { GlAccountType, JournalStatus, Prisma } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { pageResult, type PageResult } from "@/lib/data-table";
import { prisma } from "@/lib/db";
import { decimalFromNumber, roundMoney, toMoneyNumber } from "@/lib/finance/money";
import {
  validateJournalLines,
  varianceBudgetActual,
  type JournalLineDraft,
} from "@/lib/gl/money-math";

export class GlValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "GlValidationError";
    this.status = status;
  }
}

/** Default HQ chart of accounts seeded for demo / first migrate. */
export const DEFAULT_CHART: Array<{
  code: string;
  name: string;
  type: GlAccountType;
  isSystem?: boolean;
}> = [
  { code: "1000", name: "Cash on hand", type: "Asset", isSystem: true },
  { code: "1010", name: "Bank — operations", type: "Asset", isSystem: true },
  { code: "1100", name: "Mobile money float", type: "Asset", isSystem: true },
  { code: "2000", name: "Accounts payable", type: "Liability", isSystem: true },
  { code: "3000", name: "Net assets / equity", type: "Equity", isSystem: true },
  { code: "4000", name: "Tithes income", type: "Income", isSystem: true },
  { code: "4010", name: "Offerings & thanksgiving", type: "Income", isSystem: true },
  { code: "4020", name: "Special project income", type: "Income", isSystem: true },
  { code: "4030", name: "Dues income", type: "Income", isSystem: true },
  { code: "5000", name: "Ministry programmes", type: "Expense", isSystem: true },
  { code: "5100", name: "Facilities & utilities", type: "Expense", isSystem: true },
  { code: "5200", name: "Admin & office", type: "Expense", isSystem: true },
  { code: "5300", name: "Outreach & missions", type: "Expense", isSystem: true },
];

export async function ensureDefaultChart(actorId?: string | null) {
  for (const row of DEFAULT_CHART) {
    await prisma.glAccount.upsert({
      where: { code: row.code },
      update: {},
      create: {
        code: row.code,
        name: row.name,
        type: row.type,
        isSystem: row.isSystem ?? false,
        isActive: true,
      },
    });
  }
  if (actorId) {
    await writeAuditLog({
      actorId,
      action: "gl.chart.ensure_defaults",
      entityType: "GlAccount",
      metadata: { count: DEFAULT_CHART.length },
    });
  }
}

export async function listGlAccounts(opts?: {
  type?: GlAccountType;
  activeOnly?: boolean;
}) {
  return prisma.glAccount.findMany({
    where: {
      ...(opts?.type ? { type: opts.type } : {}),
      ...(opts?.activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });
}

export type CreateAccountInput = {
  code: string;
  name: string;
  type: GlAccountType;
  parentId?: string | null;
  description?: string | null;
  actorId: string;
};

export async function createGlAccount(input: CreateAccountInput) {
  const code = input.code.trim();
  const name = input.name.trim();
  if (!code || !name) {
    throw new GlValidationError("Account code and name are required.");
  }
  try {
    const created = await prisma.glAccount.create({
      data: {
        code,
        name,
        type: input.type,
        parentId: input.parentId || null,
        description: input.description?.trim() || null,
      },
    });
    await writeAuditLog({
      actorId: input.actorId,
      action: "gl.account.create",
      entityType: "GlAccount",
      entityId: created.id,
      metadata: { code: created.code, type: created.type },
    });
    return created;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new GlValidationError(`Account code ${code} already exists.`);
    }
    throw error;
  }
}

const journalInclude = {
  lines: {
    include: {
      account: { select: { id: true, code: true, name: true, type: true } },
    },
    orderBy: [{ debit: "desc" as const }, { credit: "desc" as const }],
  },
  createdBy: { select: { id: true, name: true } },
  postedBy: { select: { id: true, name: true } },
  payment: {
    select: {
      id: true,
      amount: true,
      paidAt: true,
      obligationId: true,
    },
  },
  expense: { select: { id: true, description: true } },
} satisfies Prisma.JournalEntryInclude;

type JournalWithRelations = Prisma.JournalEntryGetPayload<{
  include: typeof journalInclude;
}>;

export async function listJournalEntries(filters: {
  status?: JournalStatus;
  from?: Date;
  to?: Date;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PageResult<JournalWithRelations>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const where: Prisma.JournalEntryWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.from || filters.to
      ? {
          entryDate: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
    ...(filters.q?.trim()
      ? {
          OR: [
            { memo: { contains: filters.q.trim(), mode: "insensitive" } },
            { reference: { contains: filters.q.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, items] = await Promise.all([
    prisma.journalEntry.count({ where }),
    prisma.journalEntry.findMany({
      where,
      include: journalInclude,
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return pageResult(items, total, page, pageSize);
}

export async function getJournalEntry(id: string) {
  return prisma.journalEntry.findUnique({
    where: { id },
    include: journalInclude,
  });
}

export type CreateJournalInput = {
  entryDate: Date;
  memo?: string | null;
  reference?: string | null;
  lines: JournalLineDraft[];
  paymentId?: string | null;
  obligationId?: string | null;
  postImmediately?: boolean;
  actorId: string;
};

export async function createJournalEntry(input: CreateJournalInput) {
  const balanced = validateJournalLines(input.lines);
  if (!balanced.ok) throw new GlValidationError(balanced.error);

  const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
  const accounts = await prisma.glAccount.findMany({
    where: { id: { in: accountIds }, isActive: true },
  });
  if (accounts.length !== accountIds.length) {
    throw new GlValidationError("One or more accounts are missing or inactive.");
  }

  if (input.paymentId) {
    const payment = await prisma.payment.findUnique({
      where: { id: input.paymentId },
      include: { journalEntry: true },
    });
    if (!payment) throw new GlValidationError("Payment not found.", 404);
    if (payment.journalEntry) {
      throw new GlValidationError(
        "This contribution payment is already linked to a journal entry.",
      );
    }
  }

  const status: JournalStatus = input.postImmediately ? "Posted" : "Draft";
  const created = await prisma.$transaction(async (tx) => {
    const entry = await tx.journalEntry.create({
      data: {
        entryDate: input.entryDate,
        memo: input.memo?.trim() || null,
        reference: input.reference?.trim() || null,
        status,
        createdById: input.actorId,
        postedById: status === "Posted" ? input.actorId : null,
        postedAt: status === "Posted" ? new Date() : null,
        paymentId: input.paymentId || null,
        obligationId: input.obligationId || null,
        lines: {
          create: input.lines.map((line) => ({
            accountId: line.accountId,
            debit: decimalFromNumber(line.debit || 0),
            credit: decimalFromNumber(line.credit || 0),
            memo: line.memo?.trim() || null,
          })),
        },
      },
      include: journalInclude,
    });

    await writeAuditLog(
      {
        actorId: input.actorId,
        action:
          status === "Posted" ? "gl.journal.create_posted" : "gl.journal.create",
        entityType: "JournalEntry",
        entityId: entry.id,
        metadata: {
          status,
          total: balanced.totalDebit,
          paymentId: input.paymentId ?? null,
          /** Never store giver names — payment id only for HQ reconciliation. */
        },
      },
      tx,
    );
    return entry;
  });

  return created;
}

export async function postJournalEntry(id: string, actorId: string) {
  const existing = await prisma.journalEntry.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!existing) throw new GlValidationError("Journal entry not found.", 404);
  if (existing.status === "Posted") {
    throw new GlValidationError("Journal entry is already posted.");
  }
  if (existing.status === "Void") {
    throw new GlValidationError("Cannot post a voided journal entry.");
  }
  const balanced = validateJournalLines(
    existing.lines.map((l) => ({
      accountId: l.accountId,
      debit: toMoneyNumber(l.debit),
      credit: toMoneyNumber(l.credit),
    })),
  );
  if (!balanced.ok) throw new GlValidationError(balanced.error);

  const updated = await prisma.journalEntry.update({
    where: { id },
    data: {
      status: "Posted",
      postedById: actorId,
      postedAt: new Date(),
    },
    include: journalInclude,
  });
  await writeAuditLog({
    actorId,
    action: "gl.journal.post",
    entityType: "JournalEntry",
    entityId: id,
    metadata: { total: balanced.totalDebit },
  });
  return updated;
}

export type CreateExpenseInput = {
  expenseDate: Date;
  description: string;
  amount: number;
  accountId: string;
  payFromAccountId: string;
  vendor?: string | null;
  reference?: string | null;
  notes?: string | null;
  actorId: string;
};

export async function createExpense(input: CreateExpenseInput) {
  const description = input.description.trim();
  if (!description) throw new GlValidationError("Expense description is required.");
  if (input.amount <= 0) {
    throw new GlValidationError("Expense amount must be positive.");
  }
  if (input.accountId === input.payFromAccountId) {
    throw new GlValidationError("Expense and pay-from accounts must differ.");
  }

  const [expenseAccount, payFrom] = await Promise.all([
    prisma.glAccount.findUnique({ where: { id: input.accountId } }),
    prisma.glAccount.findUnique({ where: { id: input.payFromAccountId } }),
  ]);
  if (!expenseAccount || expenseAccount.type !== "Expense" || !expenseAccount.isActive) {
    throw new GlValidationError("Select an active expense account.");
  }
  if (!payFrom || payFrom.type !== "Asset" || !payFrom.isActive) {
    throw new GlValidationError("Pay-from must be an active asset (cash/bank) account.");
  }

  return prisma.$transaction(async (tx) => {
    const journal = await tx.journalEntry.create({
      data: {
        entryDate: input.expenseDate,
        memo: description,
        reference: input.reference?.trim() || null,
        status: "Posted",
        createdById: input.actorId,
        postedById: input.actorId,
        postedAt: new Date(),
        lines: {
          create: [
            {
              accountId: input.accountId,
              debit: decimalFromNumber(input.amount),
              credit: decimalFromNumber(0),
              memo: description,
            },
            {
              accountId: input.payFromAccountId,
              debit: decimalFromNumber(0),
              credit: decimalFromNumber(input.amount),
              memo: input.vendor?.trim() || description,
            },
          ],
        },
      },
    });

    const expense = await tx.expense.create({
      data: {
        expenseDate: input.expenseDate,
        description,
        amount: decimalFromNumber(input.amount),
        accountId: input.accountId,
        payFromAccountId: input.payFromAccountId,
        vendor: input.vendor?.trim() || null,
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
        journalEntryId: journal.id,
        createdById: input.actorId,
      },
      include: {
        account: true,
        payFromAccount: true,
        journalEntry: true,
      },
    });

    await writeAuditLog(
      {
        actorId: input.actorId,
        action: "gl.expense.create",
        entityType: "Expense",
        entityId: expense.id,
        metadata: {
          amount: input.amount,
          accountCode: expenseAccount.code,
          /** Vendor is operational — never a member giver identity. */
          vendor: expense.vendor,
          journalId: journal.id,
        },
      },
      tx,
    );

    return expense;
  });
}

export async function listExpenses(filters: {
  from?: Date;
  to?: Date;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const where: Prisma.ExpenseWhereInput = {
    ...(filters.from || filters.to
      ? {
          expenseDate: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
    ...(filters.q?.trim()
      ? {
          OR: [
            { description: { contains: filters.q.trim(), mode: "insensitive" } },
            { vendor: { contains: filters.q.trim(), mode: "insensitive" } },
            { reference: { contains: filters.q.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, items] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      include: {
        account: true,
        payFromAccount: true,
        journalEntry: { select: { id: true, status: true } },
      },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return pageResult(items, total, page, pageSize);
}

export type CreateBudgetInput = {
  name: string;
  fiscalYear: number;
  periodStart: Date;
  periodEnd: Date;
  notes?: string | null;
  lines: Array<{ accountId: string; amount: number; notes?: string | null }>;
  actorId: string;
};

export async function createBudget(input: CreateBudgetInput) {
  const name = input.name.trim();
  if (!name) throw new GlValidationError("Budget name is required.");
  if (input.periodEnd < input.periodStart) {
    throw new GlValidationError("Budget period end must be on or after start.");
  }
  if (!input.lines.length) {
    throw new GlValidationError("Add at least one budget line.");
  }
  for (const line of input.lines) {
    if (line.amount < 0) {
      throw new GlValidationError("Budget line amounts cannot be negative.");
    }
  }

  const created = await prisma.budget.create({
    data: {
      name,
      fiscalYear: input.fiscalYear,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      notes: input.notes?.trim() || null,
      createdById: input.actorId,
      lines: {
        create: input.lines.map((line) => ({
          accountId: line.accountId,
          amount: decimalFromNumber(line.amount),
          notes: line.notes?.trim() || null,
        })),
      },
    },
    include: {
      lines: { include: { account: true }, orderBy: { account: { code: "asc" } } },
    },
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "gl.budget.create",
    entityType: "Budget",
    entityId: created.id,
    metadata: { name: created.name, fiscalYear: created.fiscalYear },
  });
  return created;
}

export async function listBudgets() {
  return prisma.budget.findMany({
    orderBy: [{ fiscalYear: "desc" }, { name: "asc" }],
    include: {
      lines: { include: { account: true } },
      _count: { select: { lines: true } },
    },
  });
}

export async function getBudget(id: string) {
  return prisma.budget.findUnique({
    where: { id },
    include: {
      lines: {
        include: { account: true },
        orderBy: { account: { code: "asc" } },
      },
    },
  });
}

/**
 * Budget vs actual by account — aggregates only.
 * Never includes member / giver identity (Board-safe when rolled into reports).
 */
export async function getBudgetVsActual(budgetId: string) {
  const budget = await getBudget(budgetId);
  if (!budget) throw new GlValidationError("Budget not found.", 404);

  const postedLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        status: "Posted",
        entryDate: { gte: budget.periodStart, lte: budget.periodEnd },
      },
      accountId: { in: budget.lines.map((l) => l.accountId) },
    },
    select: {
      accountId: true,
      debit: true,
      credit: true,
      account: { select: { type: true } },
    },
  });

  const actualByAccount = new Map<string, number>();
  for (const line of postedLines) {
    const debit = toMoneyNumber(line.debit);
    const credit = toMoneyNumber(line.credit);
    // Expense/Asset: net debit; Income/Liability/Equity: net credit
    const net =
      line.account.type === "Expense" || line.account.type === "Asset"
        ? roundMoney(debit - credit)
        : roundMoney(credit - debit);
    actualByAccount.set(
      line.accountId,
      roundMoney((actualByAccount.get(line.accountId) ?? 0) + net),
    );
  }

  const rows = budget.lines.map((line) => {
    const budgetAmount = toMoneyNumber(line.amount);
    const actual = actualByAccount.get(line.accountId) ?? 0;
    return {
      accountId: line.accountId,
      code: line.account.code,
      name: line.account.name,
      type: line.account.type,
      budget: budgetAmount,
      actual,
      variance: varianceBudgetActual(budgetAmount, actual),
    };
  });

  return {
    budget: {
      id: budget.id,
      name: budget.name,
      fiscalYear: budget.fiscalYear,
      periodStart: budget.periodStart,
      periodEnd: budget.periodEnd,
    },
    rows,
    totals: {
      budget: roundMoney(rows.reduce((s, r) => s + r.budget, 0)),
      actual: roundMoney(rows.reduce((s, r) => s + r.actual, 0)),
      variance: roundMoney(rows.reduce((s, r) => s + r.variance, 0)),
    },
  };
}

/** Account activity rollup for CSV — no giver names. */
export async function exportPostedJournalCsv(filters: {
  from?: Date;
  to?: Date;
}): Promise<string> {
  const entries = await prisma.journalEntry.findMany({
    where: {
      status: "Posted",
      ...(filters.from || filters.to
        ? {
            entryDate: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    include: {
      lines: { include: { account: true } },
    },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });

  const header = [
    "entryDate",
    "entryId",
    "reference",
    "memo",
    "accountCode",
    "accountName",
    "accountType",
    "debit",
    "credit",
  ];
  const rows = [header.join(",")];
  for (const entry of entries) {
    for (const line of entry.lines) {
      const cells = [
        entry.entryDate.toISOString().slice(0, 10),
        entry.id,
        csv(entry.reference),
        csv(entry.memo),
        csv(line.account.code),
        csv(line.account.name),
        line.account.type,
        toMoneyNumber(line.debit).toFixed(2),
        toMoneyNumber(line.credit).toFixed(2),
      ];
      rows.push(cells.join(","));
    }
  }
  return rows.join("\n");
}

function csv(value: string | null | undefined): string {
  if (value == null) return "";
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * Post a simple income journal from an HQ contribution payment (Cash debit / Income credit).
 * Reconciliation helper — stores paymentId only, never member name on the journal.
 */
export async function reconcilePaymentToIncome(input: {
  paymentId: string;
  incomeAccountId: string;
  cashAccountId: string;
  actorId: string;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: {
      journalEntry: true,
      obligation: { include: { obligationType: true } },
    },
  });
  if (!payment) throw new GlValidationError("Payment not found.", 404);
  if (payment.journalEntry) {
    throw new GlValidationError("Payment already reconciled to the ledger.");
  }

  const amount = toMoneyNumber(payment.amount);
  return createJournalEntry({
    entryDate: payment.paidAt,
    memo: `Contribution reconcile — ${payment.obligation.obligationType.name}`,
    reference: payment.reference ?? payment.id,
    paymentId: payment.id,
    obligationId: payment.obligationId,
    postImmediately: true,
    actorId: input.actorId,
    lines: [
      {
        accountId: input.cashAccountId,
        debit: amount,
        credit: 0,
        memo: "Cash / bank",
      },
      {
        accountId: input.incomeAccountId,
        debit: 0,
        credit: amount,
        memo: payment.obligation.obligationType.code,
      },
    ],
  });
}
