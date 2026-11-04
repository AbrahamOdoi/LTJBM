import {
  getBalanceRollup,
  listCollectionBatches,
  listDuesArrears,
  listObligations,
} from "../src/lib/finance/service";
import { canAccessFinance, canWriteFinance } from "../src/lib/roles";

async function main() {
  const rollup = await getBalanceRollup({});
  const arrears = await listDuesArrears({ pageSize: 100 });
  const batches = await listCollectionBatches({ pageSize: 100 });
  const pledges = await listObligations({ kind: "Pledge", pageSize: 100 });
  const specials = await listObligations({
    kind: "SpecialProject",
    pageSize: 100,
  });

  console.log(
    JSON.stringify(
      {
        rollupTotals: rollup.totals,
        pledgeBalances: pledges.items.map((p) => ({
          member: p.member.name,
          ...p.balances,
          instalments: p.instalmentCount,
        })),
        specialBalances: specials.items.map((p) => ({
          member: p.member.name,
          ...p.balances,
          projectTarget: p.projectTargetAmount,
        })),
        arrearsCount: arrears.total,
        arrears: arrears.items.map((a) => ({
          member: a.member.name,
          outstanding: a.balances.outstanding,
        })),
        batches: batches.items.map((b) => ({
          label: b.label,
          counted: b.countedTotal,
          system: b.systemTotal,
          variance: b.varianceAmount,
          hasVariance: b.hasVariance,
        })),
        rbac: {
          clerkAccess: canAccessFinance("RecordsClerk"),
          clerkWrite: canWriteFinance("RecordsClerk"),
          financeWrite: canWriteFinance("FinancialSecretary"),
          boardAccess: canAccessFinance("PastoralBoard"),
          boardWrite: canWriteFinance("PastoralBoard"),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
