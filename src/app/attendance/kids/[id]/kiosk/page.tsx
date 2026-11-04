import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { KidsKioskCheckIn } from "@/components/kids/kiosk-check-in";
import {
  issueKidsTokenAction,
  toggleKidsKioskAction,
} from "@/lib/kids/actions";
import {
  ensureKidsCheckInToken,
  getKidsSession,
} from "@/lib/kids/service";
import { requireAttendanceAccess } from "@/lib/auth-guards";
import { canWriteAttendance } from "@/lib/roles";

type Params = Promise<{ id: string }>;

export default async function KidsKioskPage({ params }: { params: Params }) {
  const session = await requireAttendanceAccess().catch(() => null);
  if (!session) redirect("/login");

  const { id } = await params;
  const row = await getKidsSession(id);
  if (!row) notFound();

  const writeOk = canWriteAttendance(session.user.role);
  let token = row.checkInToken;
  if (writeOk && !token) {
    token = await ensureKidsCheckInToken(id, session.user.id);
  }

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const checkInUrl = token ? `${proto}://${host}/kids-check-in/${token}` : null;
  const qrSrc = checkInUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(checkInUrl)}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--lt-muted)]">
            <Link href={`/attendance/kids/${id}`} className="lt-link">
              Session
            </Link>{" "}
            / kiosk
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            {row.label} — children’s kiosk
          </h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            {row.heldAt.toISOString().slice(0, 10)} · {row.branch.name}
            {" · "}
            {row.checkIns.filter((c) => c.status === "CheckedIn").length} in room
          </p>
        </div>
        {writeOk ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/attendance/kids/${id}/release`}
              className="lt-btn-secondary"
            >
              Release desk
            </Link>
            {!token ? (
              <form action={issueKidsTokenAction}>
                <input type="hidden" name="sessionId" value={id} />
                <button type="submit" className="lt-btn-secondary">
                  Issue QR token
                </button>
              </form>
            ) : null}
            <form action={toggleKidsKioskAction}>
              <input type="hidden" name="sessionId" value={id} />
              <input
                type="hidden"
                name="enabled"
                value={row.kioskEnabled ? "0" : "1"}
              />
              <button type="submit" className="lt-btn-secondary">
                {row.kioskEnabled ? "Close check-in" : "Open check-in"}
              </button>
            </form>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        {writeOk && row.kioskEnabled ? (
          <KidsKioskCheckIn sessionId={row.id} branchId={row.branchId} />
        ) : (
          <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
            {row.kioskEnabled
              ? "Kiosk marking requires attendance write access."
              : "Guardian and kiosk check-in are closed for this session."}
          </p>
        )}

        <aside className="lt-panel space-y-3 p-4">
          <h3 className="text-sm font-medium text-[var(--lt-ink)]">
            Guardian mobile QR
          </h3>
          {qrSrc && checkInUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt="Children’s check-in QR code"
                width={220}
                height={220}
                className="mx-auto rounded-md border border-[var(--lt-line)] bg-white p-2"
              />
              <p className="break-all text-xs text-[var(--lt-muted)]">
                {checkInUrl}
              </p>
              <p className="text-xs text-[var(--lt-muted)]">
                Guardians scan, enter their member number, and check in a linked
                child. Pickup code prints on success.
              </p>
            </>
          ) : (
            <p className="text-sm text-[var(--lt-muted)]">
              Issue a check-in token to show the QR code.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
