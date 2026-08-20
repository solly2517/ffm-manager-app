import { describe, expect, it, vi } from "vitest";
import { deliveryProofExportFeedback, runDeliveryProofExport } from "./deliveryProofExport";

describe("deliveryProofExportFeedback", () => {
  it("confirms a successful delivery-proof CSV download", () => {
    expect(deliveryProofExportFeedback(true)).toEqual({ kind: "success", text: "Delivery-proof CSV downloaded." });
  });

  it("provides a retryable generic recovery message when CSV data is unavailable", () => {
    expect(deliveryProofExportFeedback(false)).toEqual({ kind: "error", text: "Unable to prepare the delivery-proof CSV. Please try again." });
  });

  it("preserves the export service error when one is available", () => {
    expect(deliveryProofExportFeedback(false, "Export service is temporarily unavailable")).toEqual({ kind: "error", text: "Export service is temporarily unavailable" });
  });

  it("returns visible retry feedback when the Manager export refetch fails", async () => {
    const saveCsv = vi.fn();
    const feedback = await runDeliveryProofExport(async () => ({ error: { message: "Export service is temporarily unavailable" } }), saveCsv);
    expect(feedback).toEqual({ kind: "error", text: "Export service is temporarily unavailable" });
    expect(saveCsv).not.toHaveBeenCalled();
  });

  it("returns visible recovery feedback when the Manager export request throws", async () => {
    const feedback = await runDeliveryProofExport(async () => { throw new Error("Network connection lost"); }, vi.fn());
    expect(feedback).toEqual({ kind: "error", text: "Network connection lost" });
  });
});
