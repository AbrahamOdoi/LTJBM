import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMembersAccess } from "@/lib/auth-guards";
import { getMemberDetail } from "@/lib/members/queries";
import { photoPublicUrl } from "@/lib/members/photos";

type Params = Promise<{ id: string }>;

export default async function MemberPrintPage({ params }: { params: Params }) {
  const session = await requireMembersAccess().catch(() => null);
  if (!session) redirect("/login");

  const { id } = await params;
  const member = await getMemberDetail(session.user, id);
  if (!member) notFound();

  const photo = photoPublicUrl(member.photoKey);
  const groups = member.groups
    .map((g) => g.cell?.name ?? g.fellowshipMinistry?.name)
    .filter(Boolean)
    .join(", ");
  const household = member.households[0]?.household.name;

  return (
    <div className="mx-auto max-w-3xl bg-white px-8 py-10 text-slate-900 print:max-w-none">
      <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
        <Link href={`/members/${member.id}`} className="text-sm text-sky-800 hover:underline">
          ← Back
        </Link>
        <button
          type="button"
          onClick={() => {}}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          // print via script tag below for progressive enhancement without client component
        >
          Print
        </button>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `document.querySelector('button')?.addEventListener('click',()=>window.print());`,
        }}
      />

      <header className="border-b border-slate-300 pb-4 mb-6 flex gap-6 items-start">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-28 w-28 object-cover border border-slate-200" />
        ) : (
          <div className="h-28 w-28 border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
            No photo
          </div>
        )}
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            LTJBM · Member record
          </p>
          <h1 className="mt-1 text-3xl font-semibold">
            {member.firstName} {member.otherNames ? `${member.otherNames} ` : ""}
            {member.lastName}
          </h1>
          <p className="mt-1 text-slate-600">
            {member.memberNumber} · {member.status}
          </p>
        </div>
      </header>

      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-slate-500">Branch</dt>
          <dd className="font-medium">
            {member.branch.name} ({member.branch.country})
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Groups</dt>
          <dd className="font-medium">{groups || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Household</dt>
          <dd className="font-medium">{household || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Phone</dt>
          <dd className="font-medium">{member.phone || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Email</dt>
          <dd className="font-medium">{member.email || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Date of birth</dt>
          <dd className="font-medium">
            {member.dateOfBirth
              ? member.dateOfBirth.toISOString().slice(0, 10)
              : "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Address</dt>
          <dd className="font-medium">
            {[member.addressLine1, member.addressLine2, member.city, member.region, member.country]
              .filter(Boolean)
              .join(", ") || "—"}
          </dd>
        </div>
      </dl>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Status / transfer history
        </h2>
        <ul className="space-y-2 text-sm">
          {member.statusHistory.map((h) => (
            <li key={h.id} className="border-b border-slate-100 pb-2">
              {h.fromStatus ?? "—"} → {h.toStatus}
              {h.fromBranch || h.toBranch
                ? ` · ${h.fromBranch?.name ?? "—"} → ${h.toBranch?.name ?? "—"}`
                : ""}
              {h.reason ? ` — ${h.reason}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
