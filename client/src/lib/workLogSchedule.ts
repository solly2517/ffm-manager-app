export type ScheduledClinicalVisit = { date: string; clientId: string; doctorId: string };

export function sixDaySchedule(weekOf: string): ScheduledClinicalVisit[] {
  const start = new Date(`${weekOf}T12:00:00`);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date: date.toISOString().slice(0, 10), clientId: "", doctorId: "" };
  });
}

export function scheduleIsComplete(schedule: ScheduledClinicalVisit[]) {
  return schedule.length === 6 && schedule.every((visit) => Boolean(visit.date && visit.clientId && visit.doctorId));
}

export function hasAtLeastHospitals(schedule: ScheduledClinicalVisit[], minimum = 3) {
  return new Set(schedule.map((visit) => visit.clientId).filter(Boolean)).size >= minimum;
}

export function scheduleAsText(schedule: ScheduledClinicalVisit[], clientName: (id: string) => string, doctorName: (id: string) => string) {
  return schedule.map((visit) => `${visit.date} — ${clientName(visit.clientId)} — ${doctorName(visit.doctorId)}`).join("\n");
}
