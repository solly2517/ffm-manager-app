import { describe, expect, it } from "vitest";
import { utils } from "xlsx";
import { buildImplantReportWorkbook, buildOperationalSummaryWorkbook, buildReportWorkbook, buildSurgeryReportWorkbook, buildTaskReportWorkbook } from "./reportExcel";

describe("buildReportWorkbook", () => {
  it("creates summary, task, surgery, and implant worksheets with the requested surgery details", () => {
    const workbook = buildReportWorkbook(
      { clients: 1, tasks: 2, completedTasks: 1, pendingTasks: 1 },
      [{ id: 3, scheduledAt: new Date("2026-08-20T08:00:00Z"), status: "completed", clientName: "EMC", delegateName: "Solly" }],
      [{ surgeryId: 8, surgeryDate: new Date("2026-08-20T10:00:00Z"), status: "confirmed", procedureName: "ACL", hospital: "EMC", doctor: "Dr. Eslam Fahmy", delegateName: "Solly", managerName: "Mohamed Selim", totalImplantPrice: "SAR 500.00", implants: [{ id: 1, implantName: "ACL screw", quantity: 2, unitPrice: 250, currency: "SAR", lineTotal: 500 }] }],
    );
    expect(workbook.SheetNames).toEqual(["Operational summary", "Tasks", "Surgery summary", "Implants used"]);
    const surgeryRows = utils.sheet_to_json<Record<string, string>>(workbook.Sheets["Surgery summary"]!);
    const implantRows = utils.sheet_to_json<Record<string, string>>(workbook.Sheets["Implants used"]!);
    expect(surgeryRows[0]).toMatchObject({ Hospital: "EMC", Doctor: "Dr. Eslam Fahmy", Delegate: "Solly", Manager: "Mohamed Selim", "Implant total": "SAR 500.00" });
    expect(implantRows[0]).toMatchObject({ Implant: "ACL screw", Quantity: "2", "Line total": "500" });
  });

  it("builds separate Excel workbooks for operational summary, tasks, surgeries, and implant detail", () => {
    const summary = { clients: 1, tasks: 1, completedTasks: 1, pendingTasks: 0 };
    const tasks = [{ id: 3, scheduledAt: new Date("2026-08-20T08:00:00Z"), status: "completed", clientName: "EMC", delegateName: "Solly" }];
    const surgeries = [{ surgeryId: 8, surgeryDate: new Date("2026-08-20T10:00:00Z"), status: "confirmed", procedureName: "ACL", hospital: "EMC", doctor: "Dr. Eslam Fahmy", delegateName: "Solly", managerName: "Mohamed Selim", totalImplantPrice: "SAR 500.00", implants: [{ id: 1, implantName: "ACL screw", quantity: 2, unitPrice: 250, currency: "SAR", lineTotal: 500 }] }];
    expect(buildOperationalSummaryWorkbook(summary).SheetNames).toEqual(["Operational summary"]);
    expect(buildTaskReportWorkbook(tasks).SheetNames).toEqual(["Tasks"]);
    expect(buildSurgeryReportWorkbook(surgeries).SheetNames).toEqual(["Surgery summary"]);
    const implants = utils.sheet_to_json<Record<string, string>>(buildImplantReportWorkbook(surgeries).Sheets["Implants used"]!);
    expect(implants[0]).toMatchObject({ Hospital: "EMC", Doctor: "Dr. Eslam Fahmy", Delegate: "Solly", Manager: "Mohamed Selim", Implant: "ACL screw" });
  });
});
