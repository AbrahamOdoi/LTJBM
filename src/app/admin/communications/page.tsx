import { redirect } from "next/navigation";
import { AdminAppShell } from "@/components/admin/app-shell";
import { requireAdmin } from "@/lib/auth-guards";
import {
  ensureCommunicationChannels,
  ensureDefaultTemplates,
  listRecentOutbox,
  setChannelEnabled,
  stubSendMessage,
} from "@/lib/comms/service";
import type { CommChannelKind } from "@prisma/client";

async function toggleChannelAction(formData: FormData) {
  "use server";
  const session = await requireAdmin();
  const kind = String(formData.get("kind") || "") as CommChannelKind;
  const enabled = String(formData.get("enabled") || "") === "true";
  if (!kind) return;
  await setChannelEnabled(kind, enabled, session.user.id);
}

async function stubTestSendAction(formData: FormData) {
  "use server";
  const session = await requireAdmin();
  const to = String(formData.get("to") || "").trim();
  const channel = String(formData.get("channel") || "Email") as CommChannelKind;
  if (!to) return;
  await stubSendMessage({
    channel,
    templateKind: "Welcome",
    toAddress: to,
    subject: "LTJBM stub welcome",
    body: "This is a stub send — would deliver when the channel provider is live.",
    actorId: session.user.id,
  });
}

export default async function AdminCommunicationsPage() {
  const session = await requireAdmin().catch(() => null);
  if (!session) redirect("/login");

  const [channels, templates, outbox] = await Promise.all([
    ensureCommunicationChannels(),
    ensureDefaultTemplates(),
    listRecentOutbox(),
  ]);

  return (
    <AdminAppShell
      title="Communications"
      subtitle="Email / SMS stubs — configure providers later; stub sends log to outbox."
      userName={session.user.name}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="lt-panel space-y-3 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
            Channels
          </h2>
          <ul className="space-y-3 text-sm">
            {channels.map((ch) => (
              <li
                key={ch.id}
                className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
              >
                <div>
                  <div className="font-medium">{ch.label}</div>
                  <p className="text-[var(--lt-muted)]">{ch.notes}</p>
                  <p className="mt-1 text-xs">
                    {ch.isEnabled ? "Marked enabled (still stub until env keys)" : "Disabled"}
                  </p>
                </div>
                <form action={toggleChannelAction}>
                  <input type="hidden" name="kind" value={ch.kind} />
                  <input
                    type="hidden"
                    name="enabled"
                    value={ch.isEnabled ? "false" : "true"}
                  />
                  <button type="submit" className="lt-btn-secondary">
                    {ch.isEnabled ? "Disable" : "Enable stub"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section className="lt-panel space-y-3 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
            Templates
          </h2>
          <ul className="space-y-2 text-sm">
            {templates.map((t) => (
              <li key={t.id} className="border-b border-slate-100 pb-2 last:border-0">
                <div className="font-medium">
                  {t.name}{" "}
                  <span className="text-xs text-[var(--lt-muted)]">
                    ({t.kind} · {t.channel})
                  </span>
                </div>
                <p className="text-[var(--lt-muted)]">{t.subject}</p>
              </li>
            ))}
          </ul>

          <form action={stubTestSendAction} className="space-y-2 border-t border-slate-200 pt-3">
            <h3 className="text-sm font-medium">Stub test send</h3>
            <select
              name="channel"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              defaultValue="Email"
            >
              <option value="Email">Email</option>
              <option value="Sms">SMS</option>
            </select>
            <input
              name="to"
              required
              placeholder="recipient@example.com or phone"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="lt-btn-primary">
              Log stub send
            </button>
          </form>
        </section>
      </div>

      <section className="lt-panel mt-6 overflow-x-auto">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-medium">
          Recent outbox (stubs)
        </h2>
        {outbox.length === 0 ? (
          <p className="p-4 text-sm text-[var(--lt-muted)]">No stub messages yet.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Channel</th>
                <th className="px-4 py-2 font-medium">To</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {outbox.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    {o.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="px-4 py-2">{o.channel}</td>
                  <td className="px-4 py-2">{o.toAddress}</td>
                  <td className="px-4 py-2">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminAppShell>
  );
}
