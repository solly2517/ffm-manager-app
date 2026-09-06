import fs from "node:fs";
import path from "node:path";
import { normalizeStockCatalogue } from "./stockCatalogueNormalizer.mjs";

const inputPath = process.argv[2] || "/home/ubuntu/upload/AL_Tamam_Stock_Management_standalone_2.html";
const outputPath = process.argv[3] || "/home/ubuntu/ffm-manager-app/data/stock-catalogue-import.json";
const reportPath = process.argv[4] || "/home/ubuntu/ffm-manager-app/data/stock-catalogue-import-report.json";
const sourceHtml = fs.readFileSync(inputPath, "utf8");
const match = sourceHtml.match(/<script\s+type=["']application\/json["']\s+id=["']catalogue-data["']>([\s\S]*?)<\/script>/i);
if (!match?.[1]) throw new Error("The supplied stock-management HTML does not contain a catalogue-data JSON block");

const { records, report } = normalizeStockCatalogue(JSON.parse(match[1]), {
  sourceLabel: "AL-Tamam Stock Management embedded catalogue — implant-only verified v2",
});
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(records, null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify({ ...report, inputFile: path.basename(inputPath) }, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, reportPath, ...report }, null, 2));
