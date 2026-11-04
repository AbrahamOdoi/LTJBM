/**
 * Minimal S3-compatible Put/Get/Delete (AWS Signature V4).
 * Works with AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces, etc.
 * No SDK dependency — Node crypto + fetch only.
 */

import { createHash, createHmac } from "crypto";

export type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
};

export function getS3ConfigFromEnv(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }
  return {
    endpoint: endpoint.replace(/\/$/, ""),
    region: process.env.S3_REGION?.trim() || "auto",
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle:
      process.env.S3_FORCE_PATH_STYLE === "1" ||
      process.env.S3_FORCE_PATH_STYLE === "true",
  };
}

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function amzDate(date: Date): { amz: string; stamp: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amz: iso, stamp: iso.slice(0, 8) };
}

function objectUrl(cfg: S3Config, key: string): { url: URL; host: string; canonicalUri: string } {
  const encodedKey = key
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  if (cfg.forcePathStyle) {
    const url = new URL(`${cfg.endpoint}/${cfg.bucket}/${encodedKey}`);
    return {
      url,
      host: url.host,
      canonicalUri: `/${cfg.bucket}/${encodedKey}`,
    };
  }
  const endpointUrl = new URL(cfg.endpoint);
  const host = `${cfg.bucket}.${endpointUrl.host}`;
  const url = new URL(`${endpointUrl.protocol}//${host}/${encodedKey}`);
  return { url, host, canonicalUri: `/${encodedKey}` };
}

function signingKey(
  secret: string,
  stamp: string,
  region: string,
  service: string,
): Buffer {
  const kDate = hmac(`AWS4${secret}`, stamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

async function signedFetch(
  cfg: S3Config,
  method: string,
  key: string,
  body?: Buffer,
  contentType?: string,
): Promise<Response> {
  const now = new Date();
  const { amz, stamp } = amzDate(now);
  const { url, host, canonicalUri } = objectUrl(cfg, key);
  const payloadHash = sha256Hex(body ?? "");
  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amz,
  };
  if (contentType) {
    headers["content-type"] = contentType;
  }
  if (body) {
    headers["content-length"] = String(body.length);
  }

  const signedHeaderNames = Object.keys(headers)
    .map((h) => h.toLowerCase())
    .sort();
  const canonicalHeaders = signedHeaderNames
    .map((name) => `${name}:${headers[name].trim()}\n`)
    .join("");
  const signedHeaders = signedHeaderNames.join(";");
  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${stamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amz,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signature = createHmac(
    "sha256",
    signingKey(cfg.secretAccessKey, stamp, cfg.region, "s3"),
  )
    .update(stringToSign, "utf8")
    .digest("hex");

  headers.authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url, {
    method,
    headers,
    body: body ? new Uint8Array(body) : undefined,
  });
}

export async function s3PutObject(
  cfg: S3Config,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const res = await signedFetch(cfg, "PUT", key, body, contentType);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`S3 PutObject failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

export async function s3GetObject(
  cfg: S3Config,
  key: string,
): Promise<{ body: Buffer; contentType: string | null } | null> {
  const res = await signedFetch(cfg, "GET", key);
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`S3 GetObject failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    body: buf,
    contentType: res.headers.get("content-type"),
  };
}

export async function s3DeleteObject(cfg: S3Config, key: string): Promise<void> {
  const res = await signedFetch(cfg, "DELETE", key);
  if (res.status === 404) return;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`S3 DeleteObject failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

export function isS3Configured(): boolean {
  return getS3ConfigFromEnv() !== null;
}
