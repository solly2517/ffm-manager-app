import { useRef, useState } from "react";
import { read, utils, writeFileXLSX } from "xlsx";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

type ParsedRow = {
  hospitalName: string;
  city?: string;
  province?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  doctorName?: string;
  specialty?: string;
  doctorPhone?: string;
  doctorEmail?: string;
};

// Accepts a handful of common header spellings so the template doesn't have
// to be followed to the letter.
const HEADER_ALIASES: Record<keyof ParsedRow, string[]> = {
  hospitalName: ["hospital name", "hospital", "client", "client name", "account"],
  city: ["city"],
  province: ["province", "region"],
  address: ["address"],
  contactPerson: ["contact person", "contact", "point of contact"],
  contactPhone: ["contact phone", "hospital phone", "phone"],
  doctorName: ["doctor name", "doctor", "physician", "surgeon"],
  specialty: ["specialty", "speciality", "department"],
  doctorPhone: ["doctor phone", "physician phone"],
  doctorEmail: ["doctor email", "physician email", "email"],
};

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildHeaderMap(headerRow: string[]): Partial<Record<keyof ParsedRow, number>> {
  const map: Partial<Record<keyof ParsedRow, number>> = {};
  headerRow.forEach((raw, idx) => {
    const norm = normalizeHeader(String(raw ?? ""));
    for (const key of Object.keys(HEADER_ALIASES) as (keyof ParsedRow)[]) {
      if (map[key] !== undefined) continue;
      if (HEADER_ALIASES[key].includes(norm)) map[key] = idx;
    }
  });
  return map;
}

function downloadTemplate() {
  const rows = [
    ["Hospital Name", "City", "Province", "Address", "Contact Person", "Contact Phone", "Doctor Name", "Specialty", "Doctor Phone", "Doctor Email"],
    ["King Fahd Hospital", "Jeddah", "Mecca Region", "", "Ahmed Al-Otaibi", "0555000000", "Dr. Sara Al-Harbi", "Orthopedic Surgery", "", ""],
    ["King Fahd Hospital", "Jeddah", "Mecca Region", "", "Ahmed Al-Otaibi", "0555000000", "Dr. Faisal Nasser", "Spine Surgery", "", ""],
  ];
  const sheet = utils.aoa_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, sheet, "Hospitals & Doctors");
  writeFileXLSX(workbook, "ffm-clients-doctors-template.xlsx");
}

export function BulkClientImport({ onImported }: { onImported?: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName] = useState("");

  const importMutation = trpc.operations.bulkImportClients.useMutation({
    onSuccess: () => { onImported?.(); },
  });

  async function handleFile(file: File) {
    setParseError("");
    importMutation.reset();
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer);
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("The file has no sheets");
      const sheet = workbook.Sheets[firstSheetName];
      const grid: unknown[][] = utils.sheet_to_json(sheet, { header: 1, blankrows: false });
      if (grid.length < 2) throw new Error("No data rows found below the header row");
      const headerMap = buildHeaderMap(grid[0].map((c) => String(c ?? "")));
      if (headerMap.hospitalName === undefined) {
        throw new Error('Could not find a "Hospital Name" column. Use the template for the expected headers.');
      }
      const parsed: ParsedRow[] = [];
      for (const line of grid.slice(1)) {
        const get = (key: keyof ParsedRow) => {
          const idx = headerMap[key];
          if (idx === undefined) return undefined;
          const v = line[idx];
          return v === undefined || v === null || v === "" ? undefined : String(v).trim();
        };
        const hospitalName = get("hospitalName");
        if (!hospitalName) continue;
        parsed.push({
          hospitalName,
          city: get("city"),
          province: get("province"),
          address: get("address"),
          contactPerson: get("contactPerson"),
          contactPhone: get("contactPhone"),
          doctorName: get("doctorName"),
          specialty: get("specialty"),
          doctorPhone: get("doctorPhone"),
          doctorEmail: get("doctorEmail"),
        });
      }
      if (parsed.length === 0) throw new Error("No usable rows found — every row was missing a hospital name");
      setRows(parsed);
    } catch (err) {
      setRows([]);
      setParseError(err instanceof Error ? err.message : String(err));
    }
  }

  const uniqueHospitals = new Set(rows.map((r) => r.hospitalName.trim().toLowerCase())).size;
  const doctorCount = rows.filter((r) => r.doctorName).length;

  return (
    <div className="blueprint-card section-card" data-testid="bulk-client-import">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Bulk setup</p>
          <h2>Import hospitals &amp; doctors from Excel</h2>
          <p className="muted">Upload a spreadsheet with hospital name, doctor name, and specialty. Existing hospitals are matched by name, not duplicated.</p>
        </div>
      </div>

      <div className="inline-form">
        <Button variant="outline" onClick={downloadTemplate}>Download template</Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Choose file…</Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        {fileName && <span className="muted">{fileName}</span>}
      </div>

      {parseError && <div className="admin-feedback error">{parseError}</div>}

      {rows.length > 0 && (
        <>
          <div className="admin-feedback">
            Parsed {rows.length} row(s): {uniqueHospitals} unique hospital(s), {doctorCount} doctor(s).
          </div>
          <div className="data-table">
            <div className="table-row table-head">
              <span>Hospital</span>
              <span>City</span>
              <span>Doctor</span>
              <span>Specialty</span>
            </div>
            {rows.slice(0, 8).map((r, i) => (
              <div className="table-row" key={i}>
                <span>{r.hospitalName}</span>
                <span>{r.city || "—"}</span>
                <span>{r.doctorName || "—"}</span>
                <span>{r.specialty || "—"}</span>
              </div>
            ))}
          </div>
          {rows.length > 8 && <p className="muted">…and {rows.length - 8} more row(s)</p>}

          <Button
            className="blueprint-button"
            disabled={importMutation.isPending}
            onClick={() => importMutation.mutate({ rows })}
          >
            {importMutation.isPending ? "Importing…" : `Import ${rows.length} row(s)`}
          </Button>
        </>
      )}

      {importMutation.error && <div className="admin-feedback error">{importMutation.error.message}</div>}

      {importMutation.data && (
        <div className="admin-feedback success">
          <p>
            {importMutation.data.clientsCreated} hospital(s) created, {importMutation.data.clientsMatched} matched to existing records,{" "}
            {importMutation.data.doctorsCreated} doctor(s) added, {importMutation.data.doctorsSkipped} doctor(s) already existed.
          </p>
          {importMutation.data.errors.length > 0 && (
            <div>
              <p>{importMutation.data.errors.length} row(s) had errors:</p>
              <ul>
                {importMutation.data.errors.slice(0, 10).map((e) => (
                  <li key={e.row}>Row {e.row}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
