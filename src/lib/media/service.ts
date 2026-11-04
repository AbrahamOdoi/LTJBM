import { Prisma } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { pageResult, type PageResult } from "@/lib/data-table";
import { prisma } from "@/lib/db";

export class MediaValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "MediaValidationError";
    this.status = status;
  }
}

export type SermonUploadMeta = {
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
};

export type SermonFilters = {
  q?: string;
  seriesId?: string;
  preacher?: string;
  from?: Date;
  to?: Date;
  publishedOnly?: boolean;
  page?: number;
  pageSize?: number;
};

function sermonWhere(filters: SermonFilters): Prisma.SermonWhereInput {
  const and: Prisma.SermonWhereInput[] = [];
  if (filters.publishedOnly) {
    and.push({ publishedToPortal: true });
  }
  if (filters.seriesId) {
    and.push({ seriesId: filters.seriesId });
  }
  if (filters.preacher?.trim()) {
    and.push({
      preacher: { contains: filters.preacher.trim(), mode: "insensitive" },
    });
  }
  if (filters.from || filters.to) {
    and.push({
      preachedAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      },
    });
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { preacher: { contains: q, mode: "insensitive" } },
        { scripture: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { series: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

const sermonInclude = {
  series: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

export async function listSermons(
  filters: SermonFilters = {},
): Promise<PageResult<Prisma.SermonGetPayload<{ include: typeof sermonInclude }>>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const where = sermonWhere(filters);
  const [total, items] = await Promise.all([
    prisma.sermon.count({ where }),
    prisma.sermon.findMany({
      where,
      include: sermonInclude,
      orderBy: [{ preachedAt: "desc" }, { title: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return pageResult(items, total, page, pageSize);
}

export async function getSermon(id: string) {
  return prisma.sermon.findUnique({
    where: { id },
    include: sermonInclude,
  });
}

export async function listSermonSeries(activeOnly = false) {
  return prisma.sermonSeries.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: "asc" },
    include: { _count: { select: { sermons: true } } },
  });
}

export type UpsertSeriesInput = {
  name: string;
  description?: string | null;
  isActive?: boolean;
  actorId: string;
};

export async function createSermonSeries(input: UpsertSeriesInput) {
  const name = input.name.trim();
  if (!name) throw new MediaValidationError("Series name is required.");
  const created = await prisma.sermonSeries.create({
    data: {
      name,
      description: input.description?.trim() || null,
      isActive: input.isActive ?? true,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "media.series.create",
    entityType: "SermonSeries",
    entityId: created.id,
    metadata: { name: created.name },
  });
  return created;
}

export type CreateSermonInput = {
  title: string;
  preacher: string;
  preachedAt: Date;
  scripture?: string | null;
  seriesId?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  uploadMeta?: SermonUploadMeta | null;
  summary?: string | null;
  publishedToPortal?: boolean;
  actorId: string;
};

export async function createSermon(input: CreateSermonInput) {
  const title = input.title.trim();
  const preacher = input.preacher.trim();
  if (!title) throw new MediaValidationError("Title is required.");
  if (!preacher) throw new MediaValidationError("Preacher is required.");
  if (Number.isNaN(input.preachedAt.getTime())) {
    throw new MediaValidationError("Valid preached date is required.");
  }
  if (input.seriesId) {
    const series = await prisma.sermonSeries.findUnique({
      where: { id: input.seriesId },
    });
    if (!series) throw new MediaValidationError("Series not found.", 404);
  }

  const created = await prisma.sermon.create({
    data: {
      title,
      preacher,
      preachedAt: input.preachedAt,
      scripture: input.scripture?.trim() || null,
      seriesId: input.seriesId || null,
      audioUrl: input.audioUrl?.trim() || null,
      videoUrl: input.videoUrl?.trim() || null,
      uploadMeta: input.uploadMeta
        ? (input.uploadMeta as Prisma.InputJsonValue)
        : undefined,
      summary: input.summary?.trim() || null,
      publishedToPortal: input.publishedToPortal ?? true,
      createdById: input.actorId,
    },
    include: sermonInclude,
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "media.sermon.create",
    entityType: "Sermon",
    entityId: created.id,
    metadata: { title: created.title, preacher: created.preacher },
  });
  return created;
}

export type UpdateSermonInput = CreateSermonInput & { id: string };

export async function updateSermon(input: UpdateSermonInput) {
  const existing = await prisma.sermon.findUnique({ where: { id: input.id } });
  if (!existing) throw new MediaValidationError("Sermon not found.", 404);

  const title = input.title.trim();
  const preacher = input.preacher.trim();
  if (!title) throw new MediaValidationError("Title is required.");
  if (!preacher) throw new MediaValidationError("Preacher is required.");

  const updated = await prisma.sermon.update({
    where: { id: input.id },
    data: {
      title,
      preacher,
      preachedAt: input.preachedAt,
      scripture: input.scripture?.trim() || null,
      seriesId: input.seriesId || null,
      audioUrl: input.audioUrl?.trim() || null,
      videoUrl: input.videoUrl?.trim() || null,
      uploadMeta: input.uploadMeta
        ? (input.uploadMeta as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      summary: input.summary?.trim() || null,
      publishedToPortal: input.publishedToPortal ?? true,
    },
    include: sermonInclude,
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "media.sermon.update",
    entityType: "Sermon",
    entityId: updated.id,
    metadata: { title: updated.title },
  });
  return updated;
}
