import { mkdir, writeFile, unlink, readFile, access } from "fs/promises";
import path from "path";
import {
  getS3ConfigFromEnv,
  s3DeleteObject,
  s3GetObject,
  s3PutObject,
} from "@/lib/storage/s3";

/** Local fallback directory — outside `public/` so files are not statically served. */
export const LOCAL_PHOTO_DIR = path.join(
  process.cwd(),
  "storage",
  "uploads",
  "members",
);

/** Legacy demo path under public/ (pre–Phase F). */
export const LEGACY_PUBLIC_PHOTO_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "members",
);

function objectKey(photoKey: string): string {
  return `members/${photoKey}`;
}

export function photoStorageMode(): "s3" | "local" {
  return getS3ConfigFromEnv() ? "s3" : "local";
}

export async function putMemberPhotoBytes(
  photoKey: string,
  body: Buffer,
  contentType: string,
): Promise<"s3" | "local"> {
  const cfg = getS3ConfigFromEnv();
  if (cfg) {
    await s3PutObject(cfg, objectKey(photoKey), body, contentType);
    return "s3";
  }
  await mkdir(LOCAL_PHOTO_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_PHOTO_DIR, photoKey), body);
  return "local";
}

export async function getMemberPhotoBytes(
  photoKey: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  const cfg = getS3ConfigFromEnv();
  if (cfg) {
    const obj = await s3GetObject(cfg, objectKey(photoKey));
    if (!obj) return null;
    return {
      body: obj.body,
      contentType: obj.contentType || guessContentType(photoKey),
    };
  }

  for (const dir of [LOCAL_PHOTO_DIR, LEGACY_PUBLIC_PHOTO_DIR]) {
    const filePath = path.join(dir, photoKey);
    try {
      await access(filePath);
      const body = await readFile(filePath);
      return { body, contentType: guessContentType(photoKey) };
    } catch {
      // try next
    }
  }
  return null;
}

export async function deleteMemberPhotoBytes(photoKey: string): Promise<void> {
  const cfg = getS3ConfigFromEnv();
  if (cfg) {
    await s3DeleteObject(cfg, objectKey(photoKey));
    return;
  }
  for (const dir of [LOCAL_PHOTO_DIR, LEGACY_PUBLIC_PHOTO_DIR]) {
    try {
      await unlink(path.join(dir, photoKey));
    } catch {
      // missing is fine
    }
  }
}

function guessContentType(photoKey: string): string {
  const lower = photoKey.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
