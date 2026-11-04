import { randomUUID } from "crypto";
import {
  deleteMemberPhotoBytes,
  photoStorageMode,
  putMemberPhotoBytes,
} from "@/lib/storage/photos-backend";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Public URL for a member photo.
 * Demo placeholders stay on static `/images/avatars`.
 * Real photos go through the ACL-gated proxy (local disk or S3).
 */
export function photoPublicUrl(photoKey: string | null | undefined): string | null {
  if (!photoKey) return null;
  if (photoKey.startsWith("demo-")) {
    return `/images/avatars/${photoKey}`;
  }
  return `/api/members/photos/${encodeURIComponent(photoKey)}`;
}

export function getPhotoStorageMode(): "s3" | "local" {
  return photoStorageMode();
}

export async function saveMemberPhoto(file: File): Promise<string> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Photo must be JPEG, PNG, or WebP.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Photo must be 2MB or smaller.");
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await putMemberPhotoBytes(key, buffer, file.type);
  return key;
}

export async function deleteMemberPhoto(photoKey: string | null | undefined) {
  if (!photoKey) return;
  if (photoKey.startsWith("demo-")) return;
  try {
    await deleteMemberPhotoBytes(photoKey);
  } catch {
    // Missing object is fine for demo / local storage.
  }
}
