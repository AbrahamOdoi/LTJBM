import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { KioskCheckIn } from "@/components/attendance/kiosk-check-in";
import {
  issueCheckInTokenAction,
  toggleKioskAction,
} from "@/lib/attendance/actions";
import {
  ensureSessionCheckInToken,
  getAttendanceSession,
} from "@/lib/attendance/service";
import { requireAttendanceAccess } from "@/lib/auth-guards";
import { canWriteAttendance } from "@/lib/roles";

type Params = Promise<{ id: string }>;

export default async function AttendanceKioskPage({
  params,
}: {
  params: Params;
}) {
  const session = await requireAttendanceAccess().catch(() => null);
  if (!session) redirect("/login");

  const { id } = await params;
  const row = await getAttendanceSession(id);
  if (!row) notFound();

  const writeOk = canWriteAttendance(session.user.role);
  let token = row.checkInToken;
  if (writeOk && !token) {
    token = await ensureSessionCheckInToken(id, session.user.id);
  }

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const checkInUrl = token ? `${proto}://${host}/check-in/${token}` : null;
  const qrSrc = checkInUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(checkInUrl)}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--lt-muted)]">
            <Link href={`/attendance/${id}`} className="lt-link">
              Session
            </Link>{" "}
            / kiosk
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            {row.label} — kiosk
          </h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            {row.kind} · {row.heldAt.toISOString().slice(0, 10)} · {row.branch.name}
            {" · "}
            {row.records.filter((r) => r.present).length} present
            {row.kioskEnabled ? "" : " · check-in closed"}
          </p>
        </div>
        {writeOk ? (
          <div className="flex flex-wrap gap-2">
            {!token ? (
              <form action={issueCheckInTokenAction}>
                <input type="hidden" name="sessionId" value={id} />
                <button type="submit" className="lt-btn-secondary">
                  Issue QR token
                </button>
              </form>
            ) : null}
            <form action={toggleKioskAction}>
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
          <KioskCheckIn sessionId={row.id} branchId={row.branchId} />
        ) : (
          <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
            {row.kioskEnabled
              ? "Kiosk marking requires attendance write access."
              : "Mobile and kiosk check-in are closed for this session."}
          </p>
        )}

        <aside className="lt-panel space-y-3 p-4">
          <h3 className="text-sm font-medium text-[var(--lt-ink)]">
            Mobile QR check-in
          </h3>
          {qrSrc && checkInUrl ? (
            <>
              {/* External QR image for demo — no local QR dependency */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt="Check-in QR code"
                width={220}
                height={220}
                className="mx-auto rounded-md border border-[var(--lt-line)] bg-white p-2"
              />
              <p className="break-all text-xs text-[var(--lt-muted)]">{checkInUrl}</p>
              <p className="text-xs text-[var(--lt-muted)]">
                Members scan and enter their member number. No staff login on the
                phone.
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
