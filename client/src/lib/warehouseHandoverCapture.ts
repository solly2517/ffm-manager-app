export const MAX_LIVE_CAMERA_PROOFS = 20;

export const HANDOVER_CHECKLIST = [
  { id: "goods_confirmed", label: "Goods, tools, or returned items match the delivery task." },
  { id: "hospital_confirmed", label: "Correct hospital and receiving location are confirmed." },
  { id: "recipient_confirmed", label: "Receiving contact or responsible staff member is confirmed." },
  { id: "handover_complete", label: "Physical handover is complete before submitting photos." },
] as const;

export type HandoverChecklistId = (typeof HANDOVER_CHECKLIST)[number]["id"];
export type HandoverChecklistState = Record<HandoverChecklistId, boolean>;

export const initialHandoverChecklist = (): HandoverChecklistState => ({
  goods_confirmed: false,
  hospital_confirmed: false,
  recipient_confirmed: false,
  handover_complete: false,
});

export const isHandoverChecklistComplete = (state: HandoverChecklistState) => HANDOVER_CHECKLIST.every(item => state[item.id]);
