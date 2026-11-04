import type { PastoralNoteKind } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

export async function listPastoralNotes(limit = 50) {
  return prisma.pastoralCareNote.findMany({
    orderBy: { occurredOn: "desc" },
    take: limit,
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          memberNumber: true,
        },
      },
      author: { select: { id: true, name: true } },
    },
  });
}

export async function createPastoralNote(input: {
  kind: PastoralNoteKind;
  title: string;
  body: string;
  memberId?: string | null;
  occurredOn?: Date;
  isPrivate?: boolean;
  actorId: string;
}) {
  const note = await prisma.pastoralCareNote.create({
    data: {
      kind: input.kind,
      title: input.title,
      body: input.body,
      memberId: input.memberId ?? null,
      occurredOn: input.occurredOn ?? new Date(),
      isPrivate: input.isPrivate ?? true,
      authorId: input.actorId,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "pastoral.note_create",
    entityType: "PastoralCareNote",
    entityId: note.id,
    metadata: { kind: input.kind, memberId: input.memberId ?? null },
  });
  return note;
}
