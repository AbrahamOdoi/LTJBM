import Link from "next/link";
import { completeOnlineGiving, GivingValidationError } from "@/lib/giving/service";
import { toMoneyNumber } from "@/lib/finance/money";

type SearchParams = Promise<{ reference?: string; demo?: string }>;

export default async function GiveCompletePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const reference = sp.reference?.trim() ?? "";

  let error: string | null = null;
  let amount: number | null = null;
  let demoMode = false;
  let provider: string | null = null;
  let alreadyPosted = false;

  if (!reference) {
    error = "Missing payment reference.";
  } else {
    try {
      const result = await completeOnlineGiving(reference);
      amount = toMoneyNumber(result.checkout.amount);
      demoMode = result.checkout.demoMode;
      provider = result.checkout.provider;
      alreadyPosted = result.alreadyPosted;
    } catch (err) {
      error =
        err instanceof GivingValidationError
          ? err.message
          : "Could not confirm payment.";
    }
  }

  return (
    <div className="lt-canvas min-h-screen">
      <main className="mx-auto max-w-xl space-y-5 px-6 py-12">
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--lt-ink)]">
          {error ? "Giving not completed" : "Thank you"}
        </h1>
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : (
          <div className="lt-panel space-y-2 p-5 text-sm">
            <p>
              Your gift of{" "}
              <strong>
                GH₵
                {(amount ?? 0).toLocaleString("en-GH", {
                  minimumFractionDigits: 2,
                })}
              </strong>{" "}
              posted to the Head Office contributions ledger
              {alreadyPosted ? " (already recorded)" : ""}.
            </p>
            <p className="text-[var(--lt-muted)]">
              Provider: {provider}
              {demoMode ? " · demo / sandbox" : ""}. Reference: {reference}
            </p>
            <p className="text-[var(--lt-muted)]">
              Pastoral Board dashboards show aggregates only — never named givers.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Link href="/give" className="lt-btn-secondary">
            Give again
          </Link>
          <Link href="/login" className="lt-btn-primary">
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
