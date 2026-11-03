import type {
  CollectionBatch,
  FellowshipMinistry,
  Member,
  Obligation,
  ObligationType,
  Payment,
} from "@prisma/client";
import {
  computeObligationBalances,
  type BalanceTriplet,
} from "@/lib/finance/balances";
import { computeBatchTotals } from "@/lib/finance/batches";
import { toMoneyNumber } from "@/lib/finance/money";

type ObligationBundle = Obligation & {
  obligationType: ObligationType;
  member: Pick<Member, "id" | "firstName" | "lastName" | "memberNumber">;
  fellowshipMinistry: Pick<FellowshipMinistry, "id" | "name" | "code"> | null;
  payments: Payment[];
};

export function serializeObligation(ob: ObligationBundle) {
  const balances: BalanceTriplet = computeObligationBalances(ob);
  return {
    id: ob.id,
    memberId: ob.memberId,
    member: {
      id: ob.member.id,
      name: `${ob.member.firstName} ${ob.member.lastName}`,
      memberNumber: ob.member.memberNumber,
    },
    obligationTypeId: ob.obligationTypeId,
    obligationType: {
      id: ob.obligationType.id,
      kind: ob.obligationType.kind,
      name: ob.obligationType.name,
      code: ob.obligationType.code,
    },
    fellowshipMinistryId: ob.fellowshipMinistryId,
    fellowshipMinistry: ob.fellowshipMinistry,
    periodStart: ob.periodStart.toISOString(),
    periodEnd: ob.periodEnd?.toISOString() ?? null,
    expectedAmount: toMoneyNumber(ob.expectedAmount),
    currency: ob.currency,
    instalmentCount: ob.instalmentCount,
    projectTargetAmount:
      ob.projectTargetAmount == null
        ? null
        : toMoneyNumber(ob.projectTargetAmount),
    notes: ob.notes,
    createdAt: ob.createdAt.toISOString(),
    updatedAt: ob.updatedAt.toISOString(),
    paymentCount: ob.payments.length,
    balances,
    payments: ob.payments.map(serializePayment),
  };
}

export function serializePayment(payment: Payment) {
  return {
    id: payment.id,
    obligationId: payment.obligationId,
    batchId: payment.batchId,
    amount: toMoneyNumber(payment.amount),
    paidAt: payment.paidAt.toISOString(),
    method: payment.method,
    reference: payment.reference,
    notes: payment.notes,
    createdAt: payment.createdAt.toISOString(),
  };
}

type BatchBundle = CollectionBatch & {
  payments: Payment[];
};

export function serializeBatch(batch: BatchBundle) {
  const totals = computeBatchTotals(batch);
  return {
    id: batch.id,
    batchDate: batch.batchDate.toISOString(),
    label: batch.label,
    countedTotal: totals.countedTotal,
    systemTotal: totals.systemTotal,
    varianceAmount: totals.varianceAmount,
    hasVariance: totals.hasVariance,
    notes: batch.notes,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
    paymentCount: batch.payments.length,
    payments: batch.payments.map(serializePayment),
  };
}
