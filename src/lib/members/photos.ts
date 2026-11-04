import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "members");
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function photoPublicUrl(photoKey: string | null | undefined): string | null {
  if (!photoKey) return null;
  // Seeded demo placeholders live under public/images/avatars (tracked, non-PII).
  if (photoKey.startsWith("demo-")) {
    return `/images/avatars/${photoKey}`;
  }
  return `/uploads/members/${photoKey}`;
}

export async function saveMemberPhoto(file: File): Promise<string> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Photo must be JPEG, PNG, or WebP.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Photo must be 2MB or smaller.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, key), buffer);
  return key;
}

export async function deleteMemberPhoto(photoKey: string | null | undefined) {
  if (!photoKey) return;
  try {
    await unlink(path.join(UPLOAD_DIR, photoKey));
  } catch {
    // Missing file is fine for demo local storage.
  }
}
