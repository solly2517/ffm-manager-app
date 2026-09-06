import { describe, expect, it } from "vitest";
import { buildTravelExpensePrintDocument, parseTravelExpenseSegments } from "./travelExpensePrint";

describe("travel expense printable claim", () => {
  it("renders complete trip, cost, approval, and release details for browser PDF saving", () => {
    const html = buildTravelExpensePrintDocument({
      id: 47,
      claimantName: "Mohamed Selim",
      claimantEmail: "dr.seleam@gmail.com",
      claimDate: "2026-08-22T12:00:00.000Z",
      department: "Clinical",
      jobNature: "Hospital follow-up",
      transportMode: "car_and_plane",
      ticketReference: "TK-101",
      estimatedDays: 2,
      tripSegmentsJson: JSON.stringify([{ from: "Jeddah", to: "Riyadh", date: "2026-08-22", transportation: "plane", time: "09:15" }]),
      jobReport: "Completed the hospital visit and follow-up meeting.",
      totalAmount: 725,
      currency: "SAR",
      status: "released",
      managerApproverName: "Assigned Manager",
      managerApprovedAt: "2026-08-22T13:00:00.000Z",
      operationalApproverName: "Operational Manager",
      operationalApprovedAt: "2026-08-22T14:00:00.000Z",
      releasedAt: "2026-08-22T15:00:00.000Z",
      createdAt: "2026-08-22T12:30:00.000Z",
      lines: [{ category: "hotel", description: "Accommodation", days: 1, amountPerDay: 725, totalAmount: 725, remarks: "Receipt attached" }],
    });
    expect(html).toContain("Travel Expense Claim #47");
    expect(html).toContain("Jeddah");
    expect(html).toContain("Accommodation");
    expect(html).toContain("Assigned Manager");
    expect(html).toContain("Operational release");
    expect(html).toContain("Released");
    expect(html).toContain("@page{size:A4");
  });

  it("rejects malformed segment JSON and escapes claim text before writing print HTML", () => {
    expect(parseTravelExpenseSegments("not json")).toEqual([]);
    const html = buildTravelExpensePrintDocument({ id: 1, claimantName: "<script>alert(1)</script>", claimDate: "2026-08-22", totalAmount: 0, status: "pending", lines: [] });
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
