type Props = {
  childName: string;
  pickupCode: string;
  roomName?: string | null;
  sessionLabel: string;
};

/** Printable matching child + guardian tags (same pickup code). */
export function PickupTags({
  childName,
  pickupCode,
  roomName,
  sessionLabel,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
      <div className="rounded-md border-2 border-dashed border-[var(--lt-line)] bg-white p-4 text-center">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--lt-muted)]">
          Child tag
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--lt-ink)]">
          {childName}
        </p>
        <p className="mt-2 font-mono text-2xl font-semibold tracking-widest text-[var(--lt-accent)]">
          {pickupCode}
        </p>
        <p className="mt-2 text-xs text-[var(--lt-muted)]">
          {roomName ? `${roomName} · ` : ""}
          {sessionLabel}
        </p>
      </div>
      <div className="rounded-md border-2 border-dashed border-[var(--lt-line)] bg-white p-4 text-center">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--lt-muted)]">
          Guardian pickup tag
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--lt-ink)]">
          Present for {childName}
        </p>
        <p className="mt-2 font-mono text-2xl font-semibold tracking-widest text-[var(--lt-accent)]">
          {pickupCode}
        </p>
        <p className="mt-2 text-xs text-[var(--lt-muted)]">
          Match this code at release desk
        </p>
      </div>
    </div>
  );
}
