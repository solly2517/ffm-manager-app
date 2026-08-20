export function deliveryProofExportFeedback(hasData: boolean, errorMessage?: string) {
  return hasData
    ? { kind: "success" as const, text: "Delivery-proof CSV downloaded." }
    : { kind: "error" as const, text: errorMessage || "Unable to prepare the delivery-proof CSV. Please try again." };
}

type DeliveryProofExportResult = {
  data?: string;
  error?: { message?: string } | null;
};

/** Runs the Manager export request and returns feedback rendered by the Warehouse Heroes workspace. */
export async function runDeliveryProofExport(refetch: () => Promise<DeliveryProofExportResult>, saveCsv: (data: string) => void) {
  try {
    const result = await refetch();
    if (!result.data) return deliveryProofExportFeedback(false, result.error?.message);
    saveCsv(result.data);
    return deliveryProofExportFeedback(true);
  } catch (error) {
    return deliveryProofExportFeedback(false, error instanceof Error ? error.message : undefined);
  }
}
