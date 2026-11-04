"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AuthGuardError,
  requireMediaWrite,
} from "@/lib/auth-guards";
import {
  createSermon,
  createSermonSeries,
  MediaValidationError,
  updateSermon,
  type SermonUploadMeta,
} from "@/lib/media/service";

export type MediaActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

function isRedirectError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function parseUploadMeta(formData: FormData): SermonUploadMeta | null {
  const fileName = String(formData.get("uploadFileName") || "").trim();
  const mimeType = String(formData.get("uploadMimeType") || "").trim();
  const storageKey = String(formData.get("uploadStorageKey") || "").trim();
  const sizeRaw = String(formData.get("uploadSizeBytes") || "").trim();
  if (!fileName && !storageKey) return null;
  return {
    fileName: fileName || undefined,
    mimeType: mimeType || undefined,
    storageKey: storageKey || undefined,
    sizeBytes: sizeRaw ? Number(sizeRaw) || undefined : undefined,
  };
}

export async function createSeriesAction(
  _prev: MediaActionResult | null,
  formData: FormData,
): Promise<MediaActionResult> {
  try {
    const session = await requireMediaWrite();
    await createSermonSeries({
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || "") || null,
      actorId: session.user.id,
    });
    revalidatePath("/media");
    return { ok: true, message: "Series created." };
  } catch (error) {
    if (error instanceof AuthGuardError || error instanceof MediaValidationError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create series",
    };
  }
}

export async function createSermonAction(
  _prev: MediaActionResult | null,
  formData: FormData,
): Promise<MediaActionResult> {
  try {
    const session = await requireMediaWrite();
    const preachedRaw = String(formData.get("preachedAt") || "");
    const created = await createSermon({
      title: String(formData.get("title") || ""),
      preacher: String(formData.get("preacher") || ""),
      preachedAt: new Date(preachedRaw),
      scripture: String(formData.get("scripture") || "") || null,
      seriesId: String(formData.get("seriesId") || "") || null,
      audioUrl: String(formData.get("audioUrl") || "") || null,
      videoUrl: String(formData.get("videoUrl") || "") || null,
      uploadMeta: parseUploadMeta(formData),
      summary: String(formData.get("summary") || "") || null,
      publishedToPortal: formData.get("publishedToPortal") === "on",
      actorId: session.user.id,
    });
    revalidatePath("/media");
    revalidatePath("/portal/sermons");
    redirect(`/media/${created.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthGuardError || error instanceof MediaValidationError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create sermon",
    };
  }
}

export async function updateSermonAction(
  _prev: MediaActionResult | null,
  formData: FormData,
): Promise<MediaActionResult> {
  try {
    const session = await requireMediaWrite();
    const id = String(formData.get("id") || "");
    const preachedRaw = String(formData.get("preachedAt") || "");
    await updateSermon({
      id,
      title: String(formData.get("title") || ""),
      preacher: String(formData.get("preacher") || ""),
      preachedAt: new Date(preachedRaw),
      scripture: String(formData.get("scripture") || "") || null,
      seriesId: String(formData.get("seriesId") || "") || null,
      audioUrl: String(formData.get("audioUrl") || "") || null,
      videoUrl: String(formData.get("videoUrl") || "") || null,
      uploadMeta: parseUploadMeta(formData),
      summary: String(formData.get("summary") || "") || null,
      publishedToPortal: formData.get("publishedToPortal") === "on",
      actorId: session.user.id,
    });
    revalidatePath("/media");
    revalidatePath(`/media/${id}`);
    revalidatePath("/portal/sermons");
    return { ok: true, message: "Sermon updated." };
  } catch (error) {
    if (error instanceof AuthGuardError || error instanceof MediaValidationError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update sermon",
    };
  }
}
