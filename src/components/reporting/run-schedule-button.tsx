"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RunScheduleButton({ scheduleId }: { scheduleId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
        onClick={() => {
          startTransition(async () => {
            setError(null);
            setResult(null);
            try {
              const res = await fetch("/api/reports/schedules/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scheduleId }),
              });
              const json = (await res.json()) as {
                error?: string;
                delivery?: {
                  mode: string;
                  artifactPath: string | null;
                  subject: string;
                  recipients: string[];
                };
              };
              if (!res.ok) throw new Error(json.error ?? "Run failed");
              const d = json.delivery!;
              setResult(
                d.artifactPath
                  ? `Wrote ${d.artifactPath}`
                  : `Sent (${d.mode}): ${d.subject} → ${d.recipients.join(", ")}`,
              );
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Run failed");
            }
          });
        }}
      >
        {pending ? "Sending…" : "Run monthly Board email now"}
      </button>
      {result ? (
        <p className="text-sm text-emerald-800">{result}</p>
      ) : null}
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}
    </div>
  );
}
