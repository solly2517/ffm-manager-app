import { describe, expect, it } from "vitest";
import { HANDOVER_CHECKLIST, initialHandoverChecklist, isHandoverChecklistComplete, MAX_LIVE_CAMERA_PROOFS } from "./warehouseHandoverCapture";

describe("Warehouse Hero handover capture rules", () => {
  it("permits a queue of up to twenty live-camera delivery photos", () => {
    expect(MAX_LIVE_CAMERA_PROOFS).toBe(20);
  });

  it("requires every hospital handover confirmation before proof submission", () => {
    const checklist = initialHandoverChecklist();
    expect(isHandoverChecklistComplete(checklist)).toBe(false);
    for (const item of HANDOVER_CHECKLIST) checklist[item.id] = true;
    expect(isHandoverChecklistComplete(checklist)).toBe(true);
  });
});
