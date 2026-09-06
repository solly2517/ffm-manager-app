// Storage helpers backed by a real S3-compatible bucket (AWS S3, Cloudflare
// R2, DigitalOcean Spaces, etc.). Uploads go straight to the bucket via a
// presigned PUT URL; downloads are served through the read proxy at
// /storage/{key}, which redirects to a short-lived presigned GET URL so
// bucket credentials never reach the browser and objects can stay private.

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  const { endpoint, region, accessKeyId, secretAccessKey } = ENV.s3;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Storage config missing: set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY (see .env.example)"
    );
  }
  _client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    // R2 and most S3-compatible providers need path-style addressing.
    forcePathStyle: Boolean(endpoint),
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

function getBucket(): string {
  if (!ENV.s3.bucket) {
    throw new Error("Storage config missing: set S3_BUCKET (see .env.example)");
  }
  return ENV.s3.bucket;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const body =
    typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data);

  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { key, url: `/storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  if (ENV.s3.publicBaseUrl) {
    return `${ENV.s3.publicBaseUrl.replace(/\/+$/, "")}/${key}`;
  }
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  return getSignedUrl(getClient(), command, { expiresIn: 3600 });
}
