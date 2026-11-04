import {
  GivingCheckoutStatus,
  ObligationKind,
  type GivingProvider,
  type Prisma,
} from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { decimalFromNumber, toMoneyNumber } from "@/lib/finance/money";
import { createPayment } from "@/lib/finance/service";
import {
  type GivingMethod,
  type GivingProviderId,
  initiateCheckout,
  listGivingProviders,
  resolveProvider,
  verifyCheckout,
} from "@/lib/giving/providers";
import { enqueueReceiptForPayment } from "@/lib/comms/automations";

export class GivingValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "GivingValidationError";
    this.status = status;
  }
}

const GIFT_KIND_CODES = new Set([
  "TITHE",
  "THANKSGIVING",
  "SPECIAL_PROJECT",
  "PLEDGE",
  "DUES",
]);

function newReference(): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `ltjbm-${stamp}-${rand}`;
}

async function resolveSystemActorId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: {
      isActive: true,
      role: { in: ["FinancialSecretary", "Admin"] },
    },
    orderBy: { role: "asc" },
    select: { id: true },
  });
  return user?.id ?? null;
}

export type StartGivingInput = {
  amount: number;
  method: GivingMethod;
  provider?: GivingProviderId | string | null;
  memberNumber?: string | null;
  memberId?: string | null;
  obligationId?: string | null;
  giftKindCode?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;
  payerName?: string | null;
  notes?: string | null;
  callbackBaseUrl: string;
  actorId?: string | null;
};

export async function getGivingProviderStatuses() {
  return listGivingProviders();
}

export async function startOnlineGiving(input: StartGivingInput) {
  if (!(input.amount > 0)) {
    throw new GivingValidationError("Amount must be positive.");
  }
  const method = input.method;
  if (!["MoMo", "Card", "Bank"].includes(method)) {
    throw new GivingValidationError("Method must be MoMo, Card, or Bank.");
  }

  let memberId = input.memberId ?? null;
  if (!memberId && input.memberNumber?.trim()) {
    const member = await prisma.member.findFirst({
      where: {
        memberNumber: {
          equals: input.memberNumber.trim(),
          mode: "insensitive",
        },
      },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true },
    });
    if (!member) {
      throw new GivingValidationError("Member number not found.", 404);
    }
    memberId = member.id;
    input.payerEmail = input.payerEmail || member.email;
    input.payerPhone = input.payerPhone || member.phone;
    input.payerName =
      input.payerName || `${member.firstName} ${member.lastName}`.trim();
  }

  const obligationId = input.obligationId ?? null;
  if (obligationId) {
    const obl = await prisma.obligation.findUnique({
      where: { id: obligationId },
      select: { id: true, memberId: true },
    });
    if (!obl) {
      throw new GivingValidationError("Obligation not found.", 404);
    }
    if (memberId && obl.memberId !== memberId) {
      throw new GivingValidationError(
        "Obligation does not belong to this member.",
      );
    }
    memberId = memberId ?? obl.memberId;
  }

  const giftKindCode = (input.giftKindCode ?? "TITHE").toUpperCase();
  if (!obligationId && !GIFT_KIND_CODES.has(giftKindCode)) {
    throw new GivingValidationError("Invalid gift kind.");
  }
  if (!obligationId && !memberId) {
    throw new GivingValidationError(
      "Enter your membership number so the gift posts to your Head Office record.",
    );
  }

  const provider = resolveProvider(input.provider, method);
  const reference = newReference();
  const callbackUrl = `${input.callbackBaseUrl.replace(/\/$/, "")}/give/complete?reference=${encodeURIComponent(reference)}`;

  const initiated = await initiateCheckout(provider, {
    reference,
    amountGhs: input.amount,
    currency: "GHS",
    method,
    email: input.payerEmail,
    phone: input.payerPhone,
    callbackUrl,
  });

  const checkout = await prisma.onlineGivingCheckout.create({
    data: {
      reference,
      provider: initiated.provider as GivingProvider,
      method,
      amount: decimalFromNumber(input.amount),
      currency: "GHS",
      status: GivingCheckoutStatus.AwaitingProvider,
      memberId,
      obligationId,
      giftKindCode: obligationId ? null : giftKindCode,
      payerEmail: input.payerEmail ?? null,
      payerPhone: input.payerPhone ?? null,
      payerName: input.payerName ?? null,
      providerRef: initiated.providerRef,
      authorizationUrl: initiated.authorizationUrl,
      demoMode: initiated.demoMode,
      notes: input.notes ?? null,
      metadata: {
        hqLedgerOnly: true,
        boardNeverSeesNamedGiver: true,
      },
    },
  });

  await writeAuditLog({
    actorId: input.actorId ?? null,
    action: "giving.checkout.start",
    entityType: "OnlineGivingCheckout",
    entityId: checkout.id,
    metadata: {
      provider: initiated.provider,
      method,
      amount: input.amount,
      demoMode: initiated.demoMode,
      memberId,
      // Do not put payerName in audit metadata for Board-facing digests
    },
  });

  return {
    checkoutId: checkout.id,
    reference: checkout.reference,
    provider: initiated.provider,
    demoMode: initiated.demoMode,
    authorizationUrl: initiated.authorizationUrl,
  };
}

/**
 * Verify provider payment and post to HQ obligation/payment ledger only.
 * Never creates branch finance records.
 */
export async function completeOnlineGiving(reference: string) {
  const checkout = await prisma.onlineGivingCheckout.findUnique({
    where: { reference },
  });
  if (!checkout) {
    throw new GivingValidationError("Checkout not found.", 404);
  }
  if (checkout.status === GivingCheckoutStatus.Paid && checkout.paymentId) {
    return {
      alreadyPosted: true,
      checkout,
      paymentId: checkout.paymentId,
    };
  }

  const verifyRef =
    checkout.provider === "MoMo" && checkout.providerRef
      ? checkout.providerRef
      : checkout.reference;

  const verified = await verifyCheckout(
    checkout.provider as GivingProviderId,
    verifyRef,
    checkout.demoMode,
  );

  if (!verified.success) {
    await prisma.onlineGivingCheckout.update({
      where: { id: checkout.id },
      data: {
        status: GivingCheckoutStatus.Failed,
        metadata: {
          ...((checkout.metadata as object) ?? {}),
          verify: verified,
        } as Prisma.InputJsonValue,
      },
    });
    throw new GivingValidationError(
      `Payment not confirmed (${verified.rawStatus}).`,
      402,
    );
  }

  const amount = toMoneyNumber(checkout.amount);
  const actorId = await resolveSystemActorId();

  const result = await prisma.$transaction(async (tx) => {
    // Re-read inside txn for idempotency
    const fresh = await tx.onlineGivingCheckout.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    if (fresh.status === GivingCheckoutStatus.Paid && fresh.paymentId) {
      return { paymentId: fresh.paymentId, obligationId: fresh.obligationId! };
    }

    let obligationId = fresh.obligationId;
    if (!obligationId) {
      if (!fresh.memberId || !fresh.giftKindCode) {
        throw new GivingValidationError(
          "Cannot post gift without member and kind.",
        );
      }
      const type = await tx.obligationType.findUnique({
        where: { code: fresh.giftKindCode },
      });
      if (!type) {
        throw new GivingValidationError("Gift obligation type missing.", 500);
      }
      const now = new Date();
      const periodStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      const created = await tx.obligation.create({
        data: {
          memberId: fresh.memberId,
          obligationTypeId: type.id,
          periodStart,
          expectedAmount: fresh.amount,
          currency: fresh.currency,
          notes: `Online giving ${fresh.reference}`,
          projectTargetAmount:
            type.kind === ObligationKind.SpecialProject
              ? fresh.amount
              : undefined,
          instalmentCount:
            type.kind === ObligationKind.Pledge ? 1 : undefined,
        },
      });
      obligationId = created.id;
    }

    return { obligationId, paymentId: null as string | null };
  });

  // createPayment posts only to HQ obligation/payment ledger (never branch).
  const payment = await createPayment({
    obligationId: result.obligationId,
    amount,
    paidAt: new Date(),
    method: checkout.method,
    reference: checkout.reference,
    notes: `Online ${checkout.provider}${checkout.demoMode ? " (demo)" : ""} — HQ ledger only`,
    actorId,
    skipReceiptAutomation: true,
  });

  const updated = await prisma.onlineGivingCheckout.update({
    where: { id: checkout.id },
    data: {
      status: GivingCheckoutStatus.Paid,
      paymentId: payment.id,
      obligationId: result.obligationId,
      providerRef: verified.providerRef ?? checkout.providerRef,
      paidAt: new Date(),
    },
  });

  await writeAuditLog({
    actorId,
    action: "giving.checkout.complete",
    entityType: "OnlineGivingCheckout",
    entityId: updated.id,
    metadata: {
      paymentId: payment.id,
      obligationId: result.obligationId,
      provider: checkout.provider,
      demoMode: checkout.demoMode,
      amount,
      hqLedgerOnly: true,
    },
  });

  // Receipt via outbox (credentials may be absent — logged clearly)
  try {
    await enqueueReceiptForPayment(payment.id, actorId);
  } catch (err) {
    console.warn("[giving] receipt enqueue failed:", err);
  }

  return {
    alreadyPosted: false,
    checkout: updated,
    paymentId: payment.id,
  };
}

export async function listOnlineGivingForHq(opts?: {
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 25));
  const [rows, total] = await Promise.all([
    prisma.onlineGivingCheckout.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            memberNumber: true,
          },
        },
      },
    }),
    prisma.onlineGivingCheckout.count(),
  ]);
  return { rows, total, page, pageSize };
}

export async function listOpenObligationsForMember(memberId: string) {
  const obligations = await prisma.obligation.findMany({
    where: { memberId },
    include: {
      obligationType: true,
      payments: true,
    },
    orderBy: { periodStart: "desc" },
    take: 20,
  });
  return obligations.map((o) => {
    const paid = o.payments.reduce((s, p) => s + toMoneyNumber(p.amount), 0);
    const expected = toMoneyNumber(o.expectedAmount);
    return {
      id: o.id,
      kind: o.obligationType.kind,
      name: o.obligationType.name,
      periodStart: o.periodStart.toISOString().slice(0, 10),
      expected,
      paid,
      outstanding: Math.max(0, expected - paid),
    };
  });
}
