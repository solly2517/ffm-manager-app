import fs from "node:fs";
import mysql from "mysql2/promise";

const inputPath = "/home/ubuntu/ffm-manager-app/data/catalogue-import.json";
const records = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const db = await mysql.createConnection(process.env.DATABASE_URL);

const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const [[admin]] = await db.query("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1", ["dr.seleam@gmail.com"]);
if (!admin) throw new Error("The FFM Administrator account was not found");

const [existingRows] = await db.query("SELECT name, productCode FROM implantCatalogue");
const knownCodes = new Set(existingRows.filter((row) => row.productCode).map((row) => normalize(row.productCode)));
const knownNames = new Set(existingRows.map((row) => normalize(row.name)));
const rowsToInsert = records.filter((item) => {
  const codeKey = normalize(item.productCode);
  const nameKey = normalize(item.name);
  if ((codeKey && knownCodes.has(codeKey)) || knownNames.has(nameKey)) return false;
  if (codeKey) knownCodes.add(codeKey);
  knownNames.add(nameKey);
  return true;
});

for (let index = 0; index < rowsToInsert.length; index += 250) {
  const batch = rowsToInsert.slice(index, index + 250);
  const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
  const values = batch.flatMap((item) => [item.name, item.manufacturer, item.productCode, null, item.source, true, admin.id]);
  await db.query(`INSERT INTO implantCatalogue (name, manufacturer, productCode, description, source, isActive, createdBy) VALUES ${placeholders}`, values);
}

await db.end();
console.log(JSON.stringify({ supplied: records.length, existing: existingRows.length, inserted: rowsToInsert.length, skipped: records.length - rowsToInsert.length }, null, 2));
