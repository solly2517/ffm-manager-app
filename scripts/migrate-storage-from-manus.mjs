#!/usr/bin/env node
// Copies files from the still-running Manus-hosted deployment's storage into
// your new S3-compatible bucket, preserving the exact same key each file is
// referenced by in code or stored in the database. Run this BEFORE you
// decommission the old Manus deployment.
//
// Usage:
//   OLD_APP_URL=https://ffmmanager-9wxfbeae.manus.space \
//   S3_ENDPOINT=... S3_REGION=auto S3_BUCKET=... \
//   S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
//   node scripts/migrate-storage-from-manus.mjs [path/to/extra-keys.txt]
//
// extra-keys.txt (optional): one storage key per line, for any
// evidence/signature/report files stored in the database beyond the fixed
// list of static assets already baked into this script.

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "node:fs";

const OLD_APP_URL = process.env.OLD_APP_URL || "https://ffmmanager-9wxfbeae.manus.space";

// Static assets referenced by a hardcoded key somewhere in the app's source
// (logo, Arabic font, help walkthrough media). Found via:
//   grep -rn "manus-storage" client/src
const STATIC_KEYS = [
  "altamam-medical-logo-transparent_2d14d387.png",
  "ffm-dejavu-sans_3bf46f72.ttf",
  "ffm-travel-expenses-arabic-walkthrough_7f2be1e7.mp4",
  "ffm-work-log-arabic-walkthrough_5a28f707.mp4",
  "ffm-walkthrough-reference-16x9_0c8427f8.png",
];

function loadExtraKeys() {
  const file = process.argv[2];
  if (!file || !existsSync(file)) return [];
  return readFileSync(file, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const bucket = requireEnv("S3_BUCKET");
  const accessKeyId = requireEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("S3_SECRET_ACCESS_KEY");
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const region = process.env.S3_REGION || "auto";

  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials: { accessKeyId, secretAccessKey },
  });

  const keys = [...STATIC_KEYS, ...loadExtraKeys()];
  console.log(`Migrating ${keys.length} object(s) from ${OLD_APP_URL} to bucket "${bucket}"...`);

  let ok = 0;
  let failed = 0;

  for (const key of keys) {
    const sourceUrl = `${OLD_APP_URL}/manus-storage/${key}`;
    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        console.error(`  ✗ ${key} — source returned ${response.status} (old deployment may be down, or this key never existed)`);
        failed++;
        continue;
      }
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const body = Buffer.from(await response.arrayBuffer());
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
      console.log(`  ✓ ${key} (${body.length} bytes)`);
      ok++;
    } catch (error) {
      console.error(`  ✗ ${key} — ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log(`\nDone: ${ok} migrated, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main();
