import {
  getBalanceRollup,
  listCollectionBatches,
  listDuesArrears,
  listObligations,
} from "../src/lib/finance/service";
import { canAccessFinance, canWriteFinance } from "../src/lib/roles";

async function main() {
  const rollup = await getBalanceRollup({});
  const arrears = await listDuesArrears({});
  const batches = await listCollectionBatches();
  const pledges = await listObligations({ kind: "Pledge" });
  const specials = await listObligations({ kind: "SpecialProject" });

  console.log(
    JSON.stringify(
      {
        rollupTotals: rollup.totals,
        pledgeBalances: pledges.map((p) => ({
          member: p.member.name,
          ...p.balances,
          instalments: p.instalmentCount,
        })),
        specialBalances: specials.map((p) => ({
          member: p.member.name,
          ...p.balances,
          projectTarget: p.projectTargetAmount,
        })),
        arrearsCount: arrears.length,
        arrears: arrears.map((a) => ({
          member: a.member.name,
          outstanding: a.balances.outstanding,
        })),
        batches: batches.map((b) => ({
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
