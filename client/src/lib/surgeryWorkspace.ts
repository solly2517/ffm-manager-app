export function surgeryCalendarPath(surgeryId: number) {
  return `/surgery-calendar?surgery=${surgeryId}`;
}

export function selectedSurgeryIdFromSearch(search: string) {
  const value = new URLSearchParams(search).get("surgery");
  const surgeryId = Number(value);
  return Number.isSafeInteger(surgeryId) && surgeryId > 0 ? surgeryId : null;
}
