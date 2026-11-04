import {
  addMemberTagAction,
  addMilestoneAction,
  createFollowUpAction,
  removeMemberTagAction,
} from "@/lib/members/enrichment";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500";

type TagRow = { id: string; tag: { id: string; name: string } };
type MilestoneRow = {
  id: string;
  kind: string;
  occurredOn: Date;
  title: string | null;
};
type FollowUpRow = {
  id: string;
  status: string;
  notes: string | null;
  nextActionOn: Date | null;
};

export function MemberTagsPanel({
  memberId,
  tags,
  writeOk,
}: {
  memberId: string;
  tags: TagRow[];
  writeOk: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white/90 p-4 space-y-3">
      <h3 className="text-sm font-medium text-slate-800">Tags</h3>
      <ul className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <li
            key={t.id}
            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-800"
          >
            {t.tag.name}
            {writeOk ? (
              <form action={removeMemberTagAction}>
                <input type="hidden" name="memberId" value={memberId} />
                <input type="hidden" name="tagId" value={t.tag.id} />
                <button type="submit" className="text-slate-500 hover:text-rose-700" aria-label="Remove tag">
                  ×
                </button>
              </form>
            ) : null}
          </li>
        ))}
        {tags.length === 0 ? (
          <li className="text-sm text-slate-500">No tags yet.</li>
        ) : null}
      </ul>
      {writeOk ? (
        <form action={addMemberTagAction} className="flex gap-2">
          <input type="hidden" name="memberId" value={memberId} />
          <input
            name="tagName"
            placeholder="Add tag…"
            className={inputClass}
            required
          />
          <button type="submit" className="lt-btn-secondary shrink-0">
            Add
          </button>
        </form>
      ) : null}
    </section>
  );
}

export function MemberMilestonesPanel({
  memberId,
  milestones,
  writeOk,
}: {
  memberId: string;
  milestones: MilestoneRow[];
  writeOk: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white/90 p-4 space-y-3">
      <h3 className="text-sm font-medium text-slate-800">Milestones</h3>
      <ul className="space-y-2 text-sm">
        {milestones.map((m) => (
          <li key={m.id} className="border-b border-slate-100 pb-2 last:border-0">
            <span className="font-medium">{m.kind}</span>
            {m.title ? ` · ${m.title}` : ""}
            <div className="text-xs text-slate-500">
              {m.occurredOn.toISOString().slice(0, 10)}
            </div>
          </li>
        ))}
        {milestones.length === 0 ? (
          <li className="text-slate-500">No milestones recorded.</li>
        ) : null}
      </ul>
      {writeOk ? (
        <form action={addMilestoneAction} className="space-y-2">
          <input type="hidden" name="memberId" value={memberId} />
          <select name="kind" required className={inputClass} defaultValue="Baptism">
            <option value="Birthday">Birthday</option>
            <option value="WeddingAnniversary">Wedding anniversary</option>
            <option value="Baptism">Baptism</option>
            <option value="Confirmation">Confirmation</option>
            <option value="Dedication">Dedication</option>
            <option value="Other">Other</option>
          </select>
          <input type="date" name="occurredOn" required className={inputClass} />
          <input name="title" placeholder="Title (optional)" className={inputClass} />
          <button type="submit" className="lt-btn-secondary">
            Add milestone
          </button>
        </form>
      ) : null}
    </section>
  );
}

export function MemberFollowUpPanel({
  memberId,
  followUps,
  writeOk,
  isVisitor,
}: {
  memberId: string;
  followUps: FollowUpRow[];
  writeOk: boolean;
  isVisitor: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white/90 p-4 space-y-3">
      <h3 className="text-sm font-medium text-slate-800">Visitor follow-up</h3>
      <ul className="space-y-2 text-sm">
        {followUps.map((f) => (
          <li key={f.id} className="border-b border-slate-100 pb-2 last:border-0">
            <span className="font-medium">{f.status}</span>
            {f.nextActionOn ? (
              <span className="text-slate-500">
                {" "}
                · next {f.nextActionOn.toISOString().slice(0, 10)}
              </span>
            ) : null}
            {f.notes ? <div className="text-slate-600">{f.notes}</div> : null}
          </li>
        ))}
        {followUps.length === 0 ? (
          <li className="text-slate-500">No follow-up opened.</li>
        ) : null}
      </ul>
      {writeOk ? (
        <form action={createFollowUpAction} className="space-y-2">
          <input type="hidden" name="memberId" value={memberId} />
          <input type="date" name="firstVisitOn" className={inputClass} />
          <input type="date" name="nextActionOn" className={inputClass} />
          <textarea
            name="notes"
            rows={2}
            placeholder={
              isVisitor
                ? "Follow-up notes…"
                : "Opens follow-up and marks status Visitor…"
            }
            className={inputClass}
          />
          <button type="submit" className="lt-btn-secondary">
            Open follow-up
          </button>
        </form>
      ) : null}
    </section>
  );
}
