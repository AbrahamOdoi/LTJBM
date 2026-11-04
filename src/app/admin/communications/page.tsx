import { redirect } from "next/navigation";
import { AdminAppShell } from "@/components/admin/app-shell";
import { requireAdmin } from "@/lib/auth-guards";
import {
  ensureCommunicationChannels,
  ensureDefaultTemplates,
  enqueueAndSend,
  listProviderStatuses,
  listRecentOutbox,
  processQueuedOutbox,
  sendSegmentedBroadcast,
  setChannelEnabled,
} from "@/lib/comms/service";
import { runCommsAutomations } from "@/lib/comms/automations";
import { listBranchesForUser, listFellowships } from "@/lib/members/queries";
import { prisma } from "@/lib/db";
import type { CommChannelKind } from "@prisma/client";

async function toggleChannelAction(formData: FormData) {
  "use server";
  const session = await requireAdmin();
  const kind = String(formData.get("kind") || "") as CommChannelKind;
  const enabled = String(formData.get("enabled") || "") === "true";
  if (!kind) return;
  await setChannelEnabled(kind, enabled, session.user.id);
}

async function testSendAction(formData: FormData) {
  "use server";
  const session = await requireAdmin();
  const to = String(formData.get("to") || "").trim();
  const channel = String(formData.get("channel") || "Email") as CommChannelKind;
  if (!to) return;
  await enqueueAndSend({
    channel,
    templateKind: "Welcome",
    toAddress: to,
    subject: "LTJBM test message",
    body: "Test from Living Testimonies Communications. If credentials are configured this delivers; otherwise the outbox records skipped_no_credentials.",
    actorId: session.user.id,
  });
}

async function segmentSendAction(formData: FormData) {
  "use server";
  const session = await requireAdmin();
  const channel = String(formData.get("channel") || "Email") as CommChannelKind;
  const subject = String(formData.get("subject") || "").trim() || null;
  const body = String(formData.get("body") || "").trim();
  if (!body) return;
  await sendSegmentedBroadcast({
    channel,
    subject,
    body,
    templateKind: "Custom",
    actorId: session.user.id,
    filter: {
      branchId: String(formData.get("branchId") || "") || undefined,
      fellowshipId: String(formData.get("fellowshipId") || "") || undefined,
      status: String(formData.get("status") || "") || undefined,
      tagId: String(formData.get("tagId") || "") || undefined,
      q: String(formData.get("q") || "") || undefined,
      limit: 200,
    },
  });
}

async function runAutomationsAction() {
  "use server";
  const session = await requireAdmin();
  await runCommsAutomations(session.user.id);
  await processQueuedOutbox(50);
}

export default async function AdminCommunicationsPage() {
  const session = await requireAdmin().catch(() => null);
  if (!session) redirect("/login");

  const [channels, templates, outbox, providers, branches, fellowships, tags] =
    await Promise.all([
      ensureCommunicationChannels(),
      ensureDefaultTemplates(),
      listRecentOutbox(40),
      Promise.resolve(listProviderStatuses()),
      listBranchesForUser(session.user),
      listFellowships(),
      prisma.tag.findMany({ orderBy: { name: "asc" }, take: 50 }),
    ]);

  return (
    <AdminAppShell
      title="Communications"
      subtitle="Email, SMS, and WhatsApp — live when credentials are set; otherwise outbox logs skipped_no_credentials."
      userName={session.user.name}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="lt-panel space-y-3 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
            Channels
          </h2>
          <ul className="space-y-3 text-sm">
            {channels.map((ch) => {
              const provider = providers.find((p) => p.channel === ch.kind);
              return (
                <li
                  key={ch.id}
                  className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                >
                  <div>
                    <div className="font-medium">{ch.label}</div>
                    <p className="text-[var(--lt-muted)]">{ch.notes}</p>
                    <p className="mt-1 text-xs">
                      {ch.isEnabled ? "Enabled" : "Disabled"}
                      {" · "}
                      {provider?.configured
                        ? "Credentials present"
                        : "Credentials absent"}
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
                      {ch.isEnabled ? "Disable" : "Enable"}
                    </button>
                  </form>
                </li>
              );
            })}
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

          <form action={testSendAction} className="space-y-2 border-t border-slate-200 pt-3">
            <h3 className="text-sm font-medium">Test send</h3>
            <select
              name="channel"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              defaultValue="Email"
            >
              <option value="Email">Email</option>
              <option value="Sms">SMS</option>
              <option value="WhatsApp">WhatsApp</option>
            </select>
            <input
              name="to"
              required
              placeholder="recipient@example.com or phone"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="lt-btn-primary">
              Send / queue
            </button>
          </form>

          <form action={runAutomationsAction} className="border-t border-slate-200 pt-3">
            <button type="submit" className="lt-btn-secondary">
              Run birthday automation + flush outbox
            </button>
          </form>
        </section>
      </div>

      <section className="lt-panel mt-6 space-y-3 p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
          Segmented send
        </h2>
        <p className="text-sm text-[var(--lt-muted)]">
          Filter the register and queue one message per matching member. Delivery
          uses live providers when credentials exist.
        </p>
        <form action={segmentSendAction} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            Channel
            <select
              name="channel"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              defaultValue="Email"
            >
              <option value="Email">Email</option>
              <option value="Sms">SMS</option>
              <option value="WhatsApp">WhatsApp</option>
            </select>
          </label>
          <label className="text-sm">
            Branch
            <select name="branchId" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Fellowship
            <select
              name="fellowshipId"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">Any</option>
              {fellowships.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Status
            <select name="status" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Any</option>
              <option value="Active">Active</option>
              <option value="Visitor">Visitor</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
          <label className="text-sm">
            Tag
            <select name="tagId" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Any</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            Search
            <input
              name="q"
              placeholder="Name, phone, number…"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Subject (email)
            <input
              name="subject"
              placeholder="Living Testimonies update"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Message body
            <textarea
              name="body"
              required
              rows={4}
              placeholder="Dear {{firstName}}, …"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="lt-btn-primary">
              Queue segmented send
            </button>
          </div>
        </form>
      </section>

      <section className="lt-panel mt-6 overflow-x-auto">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-medium">
          Recent outbox
        </h2>
        {outbox.length === 0 ? (
          <p className="p-4 text-sm text-[var(--lt-muted)]">No messages yet.</p>
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
