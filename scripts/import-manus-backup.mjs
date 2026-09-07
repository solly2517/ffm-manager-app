#!/usr/bin/env node
// One-time import of a Manus-era `ffm-operational-snapshot-v1` backup JSON
// into this app's live MySQL database.
//
// The old Manus deployment used its own hosted auth (Google OAuth / magic
// links), so imported non-admin users have no usable password. After running
// this script, re-invite each imported user by email from Administration —
// the invite-accept flow finds the existing row by email and just attaches
// a password to it, preserving all their historical data.
//
// The admin account (matched by ADMIN_EMAIL below) is assumed to already
// exist in this database (created via /setup) — this script remaps every
// reference to the old admin id onto the real one instead of inserting a
// duplicate row.
//
// Usage (run inside the deployed container via `railway ssh`):
//   node scripts/import-manus-backup.mjs
//
// Requires env vars already present in this deployment: DATABASE_URL,
// S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY

import mysql from "mysql2/promise";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADMIN_EMAIL = "dr.seleam@gmail.com";
const BACKUP_FILE = join(__dirname, "data", "manus-backup.json");
const WAREHOUSE_PROOF_FILE = join(__dirname, "data", "warehouse-proof.jpg");
const WAREHOUSE_PROOF_KEY = "warehouse-delivery-proofs/6720001/1787317832762-image_b40dcfcb.jpg";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) { console.error(`Missing required env var: ${name}`); process.exit(1); }
  return v;
}

function loadBackupJson() {
  return JSON.parse(readFileSync(BACKUP_FILE, "utf-8"));
}

function s3Client() {
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: requireEnv("S3_ENDPOINT"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  });
}

async function uploadWarehouseProofIfPresent() {
  if (!existsSync(WAREHOUSE_PROOF_FILE)) {
    console.log(`(No ${WAREHOUSE_PROOF_FILE} found — skipping warehouse proof photo upload. Drop the file there and re-run if needed.)`);
    return;
  }
  const client = s3Client();
  const body = readFileSync(WAREHOUSE_PROOF_FILE);
  await client.send(new PutObjectCommand({ Bucket: requireEnv("S3_BUCKET"), Key: WAREHOUSE_PROOF_KEY, Body: body, ContentType: "image/jpeg" }));
  console.log(`Uploaded warehouse proof photo to R2 at key: ${WAREHOUSE_PROOF_KEY} (${body.length} bytes)`);
}

function toSqlDate(v) {
  if (v === null || v === undefined) return null;
  const d = new Date(v);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// Convert every value in a row: Date-ish string fields -> SQL datetime,
// everything else passed through as-is (numbers, strings, booleans, null).
function prepRow(row, dateFields, idFields, idMap) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (dateFields.has(k)) out[k] = toSqlDate(v);
    else if (idFields.has(k) && typeof v === "number") out[k] = idMap.get(v) ?? v;
    else out[k] = v;
  }
  return out;
}

async function insertRows(conn, table, rows, columns, { dateFields = new Set(), idFields = new Set(), idMap = new Map() } = {}) {
  if (rows.length === 0) { console.log(`  ${table}: 0 rows, skipped`); return; }
  const prepped = rows.map((r) => prepRow(r, dateFields, idFields, idMap));
  const cols = columns.filter((c) => c in prepped[0]);
  const placeholders = `(${cols.map(() => "?").join(",")})`;
  const sql = `INSERT IGNORE INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(",")}) VALUES ${prepped.map(() => placeholders).join(",")}`;
  const values = prepped.flatMap((r) => cols.map((c) => r[c] ?? null));
  const [result] = await conn.execute(sql, values);
  console.log(`  ${table}: ${result.affectedRows}/${rows.length} row(s) inserted`);
}

async function main() {
  console.log("Loading bundled backup JSON...");
  const backup = loadBackupJson();
  const data = backup.data;
  console.log(`Backup generated at ${backup.generatedAt}. Tables present: ${Object.keys(data).join(", ")}\n`);

  const dbUrl = requireEnv("DATABASE_URL");
  const conn = await mysql.createConnection(dbUrl);

  try {
    // --- Resolve the admin's real id in THIS database ---
    const [adminRows] = await conn.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [ADMIN_EMAIL]);
    if (adminRows.length === 0) {
      console.error(`No user with email ${ADMIN_EMAIL} found in this database. Run /setup first, then re-run this script.`);
      process.exit(1);
    }
    const realAdminId = adminRows[0].id;
    const oldAdminRow = data.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    const idMap = new Map();
    if (oldAdminRow) idMap.set(oldAdminRow.id, realAdminId);
    console.log(`Admin remap: old id ${oldAdminRow?.id} -> real id ${realAdminId}\n`);

    const idFields = new Set([
      "userId", "actorId", "createdBy", "invitedBy", "assignedBy", "managerId", "delegateId",
      "warehouseHeroId", "handoverId", "acknowledgedBy", "clientId", "doctorId", "senderId",
      "recipientId", "uploadedBy", "registeredBy", "readinessUpdatedBy", "assignedManagerId",
      "reviewedBy", "surgeryId", "implantCatalogueId", "taskId", "visitId", "entityId",
    ]);
    const dateFieldsCommon = new Set([
      "createdAt", "updatedAt", "lastSignedIn", "expiresAt", "acceptedAt", "capturedAt",
      "notifiedAt", "readinessUpdatedAt", "lifecycleUpdatedAt", "surgeryDate", "checkInAt",
      "checkOutAt", "readAt", "reviewedAt", "connectedAt", "completedAt", "resolvedAt", "weekOf",
    ]);

    // Insert non-admin users first, preserving their original ids
    const otherUsers = data.users.filter((u) => u.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase());
    console.log("Importing users (excluding existing admin)...");
    await insertRows(conn, "users", otherUsers,
      ["id", "openId", "name", "email", "department", "loginMethod", "role", "createdAt", "updatedAt", "lastSignedIn", "pushNotifications", "emailNotifications", "locationSharing", "defaultLanguage"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    console.log("\nImporting core records...");
    await insertRows(conn, "invitations", data.invitations,
      ["id", "email", "tokenHash", "role", "invitedBy", "expiresAt", "acceptedAt", "createdAt"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    await insertRows(conn, "clients", data.clients,
      ["id", "name", "province", "city", "address", "contactPerson", "phone", "latitude", "longitude", "createdBy", "createdAt", "updatedAt"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    await insertRows(conn, "doctors", data.doctors,
      ["id", "clientId", "name", "specialty", "department", "phone", "email", "relationship", "notes", "createdBy", "createdAt"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    await insertRows(conn, "manager_delegate_assignments", data.managerDelegateAssignments,
      ["id", "managerId", "delegateId", "assignedBy", "createdAt"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    await insertRows(conn, "manager_warehouse_hero_assignments", data.managerWarehouseHeroAssignments,
      ["id", "managerId", "warehouseHeroId", "assignedBy", "createdAt"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    await insertRows(conn, "warehouse_hero_locations", data.warehouseHeroLocations,
      ["id", "warehouseHeroId", "latitude", "longitude", "capturedAt", "updatedAt"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    await insertRows(conn, "warehouse_delivery_proofs", data.warehouseDeliveryProofs,
      ["id", "warehouseHeroId", "handoverId", "note", "captureSource", "storageKey", "mimeType", "sizeBytes", "capturedAt", "createdAt"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    await insertRows(conn, "tasks", data.tasks,
      ["id", "delegateId", "clientId", "scheduledAt", "status", "notes", "createdBy", "createdAt", "updatedAt"],
      { dateFields: new Set([...dateFieldsCommon, "scheduledAt"]), idFields, idMap });

    await insertRows(conn, "visits", data.visits,
      ["id", "taskId", "checkInAt", "checkOutAt", "checkInLat", "checkInLng", "checkOutLat", "checkOutLng", "report", "clientSignatureUrl", "createdAt", "updatedAt"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    await insertRows(conn, "evidence", data.evidence,
      ["id", "visitId", "kind", "storageKey", "mimeType", "sizeBytes", "uploadedBy", "createdAt"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    await insertRows(conn, "messages", data.messages,
      ["id", "senderId", "recipientId", "body", "createdAt", "readAt"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    await insertRows(conn, "userNotifications", data.userNotifications,
      ["id", "userId", "actorId", "kind", "title", "body", "entityType", "entityId", "readAt", "createdAt"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    await insertRows(conn, "surgeries", data.surgeries,
      ["id", "clientId", "delegateId", "assignedManagerId", "surgeryDate", "notifiedAt", "calendarStatus", "lifecycleReason", "lifecycleUpdatedAt", "hospitalConfirmed", "implantsAvailable", "delegateReady", "deliveryPrepared", "hospitalDelivered", "readinessUpdatedAt", "readinessUpdatedBy", "hospital", "surgeon", "procedureName", "status", "quotation", "invoice", "notes", "createdBy", "createdAt"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    console.log("\nImporting implant catalogue (this may take a moment: " + data.implantCatalogue.length + " rows)...");
    const CHUNK = 500;
    for (let i = 0; i < data.implantCatalogue.length; i += CHUNK) {
      const chunk = data.implantCatalogue.slice(i, i + CHUNK);
      await insertRows(conn, "implantCatalogue", chunk,
        ["id", "name", "manufacturer", "productCode", "description", "source", "isActive", "createdBy", "createdAt"],
        { dateFields: dateFieldsCommon, idFields, idMap });
    }

    await insertRows(conn, "surgeryImplants", data.surgeryImplants,
      ["id", "surgeryId", "implantCatalogueId", "implantName", "quantity", "unitPrice", "currency", "lotNumber", "serialNumber", "notes", "registeredBy", "registeredAt"],
      { dateFields: new Set([...dateFieldsCommon, "registeredAt"]), idFields, idMap });

    await insertRows(conn, "surgeryDeliveryProofs", data.surgeryDeliveryProofs,
      ["id", "surgeryId", "storageKey", "originalName", "mimeType", "sizeBytes", "note", "uploadedBy", "createdAt"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    await insertRows(conn, "visitPlans", data.visitPlans,
      ["id", "delegateId", "clientId", "proposedAt", "notes", "status", "reviewedBy", "reviewedAt", "createdAt"],
      { dateFields: new Set([...dateFieldsCommon, "proposedAt"]), idFields, idMap });

    await insertRows(conn, "geography", data.geography,
      ["id", "kind", "name", "parentId", "createdBy", "createdAt"],
      { dateFields: dateFieldsCommon, idFields, idMap });

    console.log("\nImporting audit log (" + data.auditEvents.length + " rows)...");
    for (let i = 0; i < data.auditEvents.length; i += CHUNK) {
      const chunk = data.auditEvents.slice(i, i + CHUNK);
      await insertRows(conn, "auditEvents", chunk,
        ["id", "actorId", "action", "entityType", "entityId", "metadata", "createdAt"],
        { dateFields: dateFieldsCommon, idFields, idMap });
    }

    console.log("\nDone. Re-invite these users by email from Administration so they can set a password:");
    for (const u of otherUsers) console.log(`  - ${u.email} (${u.role})`);
  } finally {
    await conn.end();
  }

  console.log("\nUploading warehouse delivery proof photo to R2 (if present)...");
  await uploadWarehouseProofIfPresent();
}

main().catch((err) => { console.error(err); process.exit(1); });
