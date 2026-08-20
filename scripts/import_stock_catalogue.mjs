import fs from "node:fs";
import mysql from "mysql2/promise";
import { normalizeProductCode } from "./stockCatalogueNormalizer.mjs";

const inputPath = process.argv[2] || "/home/ubuntu/ffm-manager-app/data/stock-catalogue-import.json";
const SOURCE_PREFIX = "AL-Tamam Stock Management embedded catalogue";
const SOURCE_LABEL = "AL-Tamam Stock Management embedded catalogue — implant-only verified v2";
const DIRECT_CLINICAL_SOURCE = "Direct clinical entry";
const records = JSON.parse(fs.readFileSync(inputPath, "utf8"));
if (!Array.isArray(records) || !records.length) throw new Error("The stock-sourced catalogue artifact is empty or invalid");
if (records.some((record) => !record.name || !record.productCode || !String(record.source || "").startsWith(SOURCE_LABEL))) {
  throw new Error("The input contains records outside the validated Al Tamam stock catalogue format");
}

const db = await mysql.createConnection(process.env.DATABASE_URL);
const [[admin]] = await db.query("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1", ["dr.seleam@gmail.com"]);
if (!admin) throw new Error("The FFM Administrator account was not found");

const [existingRows] = await db.query("SELECT id, productCode, source, isActive FROM implantCatalogue");
const incomingCodeKeys = new Set(records.map((record) => normalizeProductCode(record.productCode)));
const existingStockCodeKeys = new Set();
const protectedCodeKeys = new Set();
const staleStockIds = [];
let summary;

for (const row of existingRows) {
  const codeKey = normalizeProductCode(row.productCode);
  if (String(row.source || "").startsWith(SOURCE_LABEL)) {
    if (codeKey) existingStockCodeKeys.add(codeKey);
    if (row.isActive && !incomingCodeKeys.has(codeKey)) staleStockIds.push(row.id);
  } else if (row.isActive && String(row.source || "").startsWith(SOURCE_PREFIX)) {
    staleStockIds.push(row.id);
  } else if (row.source === DIRECT_CLINICAL_SOURCE || row.source == null || row.source === "") {
    if (codeKey) protectedCodeKeys.add(codeKey);
  }
}

const rowsToInsert = records.filter((record) => {
  const codeKey = normalizeProductCode(record.productCode);
  return !existingStockCodeKeys.has(codeKey) && !protectedCodeKeys.has(codeKey);
});
const skippedClinicalDuplicates = records.length - rowsToInsert.length - existingStockCodeKeys.size;

await db.beginTransaction();
try {
  const [legacyResult] = await db.query(
    "UPDATE implantCatalogue SET isActive = 0 WHERE isActive = 1 AND source IS NOT NULL AND source <> ? AND source NOT LIKE ?",
    [DIRECT_CLINICAL_SOURCE, `${SOURCE_PREFIX}%`],
  );
  for (let index = 0; index < staleStockIds.length; index += 500) {
    const ids = staleStockIds.slice(index, index + 500);
    const placeholders = ids.map(() => "?").join(", ");
    await db.query(`UPDATE implantCatalogue SET isActive = 0 WHERE id IN (${placeholders})`, ids);
  }
  for (let index = 0; index < rowsToInsert.length; index += 250) {
    const batch = rowsToInsert.slice(index, index + 250);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
    const values = batch.flatMap((record) => [record.name, record.manufacturer, record.productCode, record.description, record.source, true, admin.id]);
    await db.query(`INSERT INTO implantCatalogue (name, manufacturer, productCode, description, source, isActive, createdBy) VALUES ${placeholders}`, values);
  }
  const metadata = JSON.stringify({ source: SOURCE_LABEL, supplied: records.length, inserted: rowsToInsert.length, legacyDeactivated: Number(legacyResult.affectedRows ?? 0), staleStockDeactivated: staleStockIds.length, skippedClinicalDuplicates });
  await db.query("INSERT INTO auditEvents (actorId, action, entityType, entityId, metadata) VALUES (?, ?, ?, ?, ?)", [admin.id, "implant_catalogue.stock_source_imported", "implantCatalogue", null, metadata]);
  await db.commit();
  summary = { supplied: records.length, existing: existingRows.length, inserted: rowsToInsert.length, legacyDeactivated: Number(legacyResult.affectedRows ?? 0), staleStockDeactivated: staleStockIds.length, skippedClinicalDuplicates };
} catch (error) {
  await db.rollback();
  throw error;
} finally {
  await db.end();
}
console.log(JSON.stringify(summary, null, 2));
process.exit(0);
