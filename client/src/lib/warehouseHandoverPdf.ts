import { jsPDF } from "jspdf";
import { FFM_ARABIC_PDF_FONT_URL, type PdfLanguage } from "./departmentMonthlySummaryPdf";

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

const copy = {
  en: { title: "Completed Hospital Handover", brand: "Field Force Manager · Al Tamam Medical Corporation", handover: "Handover", generated: "Generated", hero: "Warehouse Hero", heroEmail: "Hero email", recipient: "Recipient", completedAt: "Completed at", proofPhotos: "Proof photos", acknowledgement: "Manager acknowledgement", acknowledgedBy: "Acknowledged by", awaiting: "Awaiting acknowledgement", handoverNote: "Handover note", signature: "Recipient signature", signatureUnavailable: "Signature image was unavailable at export time.", evidence: "Live-Camera Delivery Evidence", proofUnavailable: "Proof image unavailable", footer: "This record documents app-captured evidence and recipient acknowledgement. It does not independently verify the physical contents of the delivery." },
  ar: { title: "تسليم مكتمل إلى المستشفى", brand: "إدارة القوى الميدانية · شركة التمام الطبية", handover: "التسليم", generated: "تاريخ الإنشاء", hero: "بطل المستودع", heroEmail: "بريد البطل", recipient: "المستلم", completedAt: "وقت الإكمال", proofPhotos: "صور الإثبات", acknowledgement: "إقرار المدير", acknowledgedBy: "أقرّ به", awaiting: "بانتظار الإقرار", handoverNote: "ملاحظة التسليم", signature: "توقيع المستلم", signatureUnavailable: "تعذر توفير صورة التوقيع وقت التصدير.", evidence: "أدلة التسليم بالكاميرا المباشرة", proofUnavailable: "صورة الإثبات غير متاحة", footer: "يوثق هذا السجل الأدلة التي التقطها التطبيق وإقرار المستلم. ولا يتحقق بصورة مستقلة من المحتويات المادية للتسليم." },
} as const;

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

function text(document: jsPDF, value: string, x: number, y: number, language: PdfLanguage, options: { align?: "left" | "right"; maxWidth?: number } = {}) {
  const enhanced = document as jsPDF & { processArabic?: (input: string) => string };
  const output = language === "ar" && enhanced.processArabic ? enhanced.processArabic(value) : value;
  document.text(output, x, y, { ...options, align: language === "ar" ? (options.align ?? "right") : options.align });
}

async function useArabicFont(document: jsPDF) {
  const response = await fetch(FFM_ARABIC_PDF_FONT_URL);
  if (!response.ok) throw new Error("The Arabic handover font could not be loaded.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) { const chunk = bytes.subarray(index, index + 0x8000); for (let offset = 0; offset < chunk.length; offset += 1) binary += String.fromCharCode(chunk[offset]); }
  const enhanced = document as jsPDF & { addFileToVFS: (name: string, data: string) => void; addFont: (name: string, family: string, style: string) => void; setR2L?: (enabled: boolean) => void };
  enhanced.addFileToVFS("ffm-dejavu-sans.ttf", btoa(binary)); enhanced.addFont("ffm-dejavu-sans.ttf", "FFMArabic", "normal"); document.setFont("FFMArabic", "normal"); enhanced.setR2L?.(true);
}

function label(document: jsPDF, value: string, y: number, language: PdfLanguage) { document.setTextColor(91, 108, 108); document.setFontSize(8); text(document, value, language === "ar" ? 196 : 14, y, language); }
function value(document: jsPDF, content: string, y: number, language: PdfLanguage) { document.setTextColor(25, 55, 59); document.setFontSize(11); const lines = document.splitTextToSize(content || "—", 180) as string[]; text(document, lines.join("\n"), language === "ar" ? 196 : 14, y, language, { maxWidth: 180 }); }

export async function downloadCompletedHandoverPdf(handover: CompletedHandoverPdfData, language: PdfLanguage = "en") {
  const document = new jsPDF({ unit: "mm", format: "a4" });
  if (language === "ar") await useArabicFont(document);
  const labels = copy[language];
  const dateLocale = language === "ar" ? "ar-EG" : "en-GB";
  document.setFillColor(246, 250, 248); document.rect(0, 0, 210, 42, "F"); document.setFillColor(27, 111, 111); document.rect(0, 0, 210, 4, "F");
  document.setTextColor(25, 55, 59); document.setFontSize(17); text(document, labels.title, language === "ar" ? 196 : 14, 19, language);
  document.setTextColor(91, 108, 108); document.setFontSize(8); text(document, labels.brand, language === "ar" ? 196 : 14, 26, language);
  text(document, `${labels.handover} #${handover.id}`, language === "ar" ? 14 : 196, 19, language, { align: language === "ar" ? "left" : "right" });
  text(document, `${labels.generated} ${new Date().toLocaleString(dateLocale)}`, language === "ar" ? 14 : 196, 26, language, { align: language === "ar" ? "left" : "right" });

  label(document, labels.hero, 54, language); value(document, handover.warehouseHeroName, 60, language);
  label(document, labels.heroEmail, 71, language); value(document, handover.warehouseHeroEmail || "—", 77, language);
  label(document, labels.recipient, 88, language); value(document, handover.recipientName, 94, language);
  label(document, labels.completedAt, 105, language); value(document, new Date(handover.createdAt).toLocaleString(dateLocale), 111, language);
  label(document, labels.proofPhotos, 122, language); value(document, String(handover.proofCount), 128, language);
  label(document, labels.acknowledgement, 139, language);
  value(document, handover.acknowledgedAt ? `${labels.acknowledgedBy} ${handover.acknowledgedByName || "Manager"} ${new Date(handover.acknowledgedAt).toLocaleString(dateLocale)}` : labels.awaiting, 145, language);
  if (handover.note) { label(document, labels.handoverNote, 158, language); value(document, handover.note, 164, language); }

  document.setDrawColor(223, 241, 237); document.roundedRect(14, 181, 82, 42, 2, 2, "S"); label(document, labels.signature, 188, language);
  try { const signature = await imageUrlToDataUrl(handover.signatureUrl); document.addImage(signature, "PNG", 18, 193, 74, 24, undefined, "FAST"); }
  catch { document.setTextColor(91, 108, 108); document.setFontSize(9); text(document, labels.signatureUnavailable, language === "ar" ? 92 : 18, 204, language, { maxWidth: 70 }); }

  document.addPage(); document.setFillColor(246, 250, 248); document.rect(0, 0, 210, 26, "F"); document.setFillColor(27, 111, 111); document.rect(0, 0, 210, 4, "F"); document.setTextColor(25, 55, 59); document.setFontSize(15); text(document, labels.evidence, language === "ar" ? 196 : 14, 17, language);
  let x = 14; let y = 34;
  for (const proof of handover.proofs) {
    try { const image = await imageUrlToDataUrl(proof.url); document.addImage(image, "JPEG", x, y, 54, 40, undefined, "FAST"); document.setTextColor(91, 108, 108); document.setFontSize(7); text(document, new Date(proof.capturedAt).toLocaleString(dateLocale), language === "ar" ? x + 54 : x, y + 45, language, { maxWidth: 54 }); }
    catch { document.setDrawColor(223, 241, 237); document.rect(x, y, 54, 40, "S"); document.setTextColor(91, 108, 108); document.setFontSize(8); text(document, labels.proofUnavailable, language === "ar" ? x + 48 : x + 6, y + 21, language, { maxWidth: 44 }); }
    x += 60; if (x > 140) { x = 14; y += 58; } if (y > 240) { document.addPage(); x = 14; y = 22; }
  }
  document.setTextColor(91, 108, 108); document.setFontSize(7); text(document, labels.footer, language === "ar" ? 196 : 14, 286, language, { maxWidth: 180 });
  document.save(`ffm-completed-handover-${handover.id}${language === "ar" ? "-ar" : ""}.pdf`);
}
