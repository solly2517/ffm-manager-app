import { jsPDF } from "jspdf";

export type CompletedHandoverPdfData = {
  id: number;
  warehouseHeroName: string;
  warehouseHeroEmail: string | null;
  recipientName: string;
  createdAt: Date | string;
  note: string | null;
  signatureUrl: string;
  proofCount: number;
  proofs: Array<{ id: number; url: string; capturedAt: Date | string; note: string | null }>;
  acknowledgedAt: Date | string | null;
  acknowledgedByName: string | null;
};

async function imageUrlToDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Image is unavailable.");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image could not be prepared."));
    reader.onerror = () => reject(new Error("Image could not be prepared."));
    reader.readAsDataURL(blob);
  });
}

function label(document: jsPDF, text: string, x: number, y: number) {
  document.setTextColor(91, 108, 108);
  document.setFontSize(8);
  document.text(text.toUpperCase(), x, y);
}

function value(document: jsPDF, text: string, x: number, y: number, width = 180) {
  document.setTextColor(25, 55, 59);
  document.setFontSize(11);
  document.text(document.splitTextToSize(text || "—", width), x, y);
}

export async function downloadCompletedHandoverPdf(handover: CompletedHandoverPdfData) {
  const document = new jsPDF({ unit: "mm", format: "a4" });
  document.setFillColor(246, 250, 248);
  document.rect(0, 0, 210, 42, "F");
  document.setFillColor(27, 111, 111);
  document.rect(0, 0, 210, 4, "F");
  document.setTextColor(25, 55, 59);
  document.setFontSize(17);
  document.text("Completed Hospital Handover", 14, 19);
  document.setTextColor(91, 108, 108);
  document.setFontSize(8);
  document.text("Field Force Manager · Al Tamam Medical Corporation", 14, 26);
  document.text(`Handover #${handover.id}`, 196, 19, { align: "right" });
  document.text(`Generated ${new Date().toLocaleString()}`, 196, 26, { align: "right" });

  label(document, "Warehouse Hero", 14, 54);
  value(document, handover.warehouseHeroName, 14, 60);
  label(document, "Hero email", 14, 71);
  value(document, handover.warehouseHeroEmail || "—", 14, 77);
  label(document, "Recipient", 14, 88);
  value(document, handover.recipientName, 14, 94);
  label(document, "Completed at", 14, 105);
  value(document, new Date(handover.createdAt).toLocaleString(), 14, 111);
  label(document, "Proof photos", 14, 122);
  value(document, String(handover.proofCount), 14, 128);
  label(document, "Manager acknowledgement", 14, 139);
  value(document, handover.acknowledgedAt ? `Acknowledged by ${handover.acknowledgedByName || "Manager"} on ${new Date(handover.acknowledgedAt).toLocaleString()}` : "Awaiting acknowledgement", 14, 145);
  if (handover.note) { label(document, "Handover note", 14, 158); value(document, handover.note, 14, 164); }

  document.setDrawColor(223, 241, 237);
  document.roundedRect(14, 181, 82, 42, 2, 2, "S");
  label(document, "Recipient signature", 18, 188);
  try {
    const signature = await imageUrlToDataUrl(handover.signatureUrl);
    document.addImage(signature, "PNG", 18, 193, 74, 24, undefined, "FAST");
  } catch {
    document.setTextColor(91, 108, 108);
    document.setFontSize(9);
    document.text("Signature image was unavailable at export time.", 18, 204, { maxWidth: 70 });
  }

  document.addPage();
  document.setFillColor(246, 250, 248);
  document.rect(0, 0, 210, 26, "F");
  document.setFillColor(27, 111, 111);
  document.rect(0, 0, 210, 4, "F");
  document.setTextColor(25, 55, 59);
  document.setFontSize(15);
  document.text("Live-Camera Delivery Evidence", 14, 17);
  let x = 14;
  let y = 34;
  for (const proof of handover.proofs) {
    try {
      const image = await imageUrlToDataUrl(proof.url);
      document.addImage(image, "JPEG", x, y, 54, 40, undefined, "FAST");
      document.setTextColor(91, 108, 108);
      document.setFontSize(7);
      document.text(new Date(proof.capturedAt).toLocaleString(), x, y + 45, { maxWidth: 54 });
    } catch {
      document.setDrawColor(223, 241, 237);
      document.rect(x, y, 54, 40, "S");
      document.setTextColor(91, 108, 108);
      document.setFontSize(8);
      document.text("Proof image unavailable", x + 6, y + 21);
    }
    x += 60;
    if (x > 140) { x = 14; y += 58; }
    if (y > 240) { document.addPage(); x = 14; y = 22; }
  }
  document.setTextColor(91, 108, 108);
  document.setFontSize(7);
  document.text("This record documents app-captured evidence and recipient acknowledgement. It does not independently verify the physical contents of the delivery.", 14, 286, { maxWidth: 180 });
  document.save(`ffm-completed-handover-${handover.id}.pdf`);
}
