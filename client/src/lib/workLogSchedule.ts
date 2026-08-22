import { MAX_HOSPITALS_PER_DAY, MIN_HOSPITALS_PER_DAY, type WorkLogPlanDay } from "@shared/workLogRules";

export { MAX_HOSPITALS_PER_DAY, MIN_HOSPITALS_PER_DAY };
export type ScheduledClinicalVisit = { date: string; clientId: string; doctorId: string };
export type ScheduledPlanDay = { date: string; visits: ScheduledClinicalVisit[] };

export function sixDaySchedule(weekOf: string): ScheduledClinicalVisit[] {
  const start = new Date(`${weekOf}T12:00:00`);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date: date.toISOString().slice(0, 10), clientId: "", doctorId: "" };
  });
}

export function sixDayHospitalPlan(weekOf: string): ScheduledPlanDay[] {
  return sixDaySchedule(weekOf).map((day) => ({ date: day.date, visits: Array.from({ length: MIN_HOSPITALS_PER_DAY }, () => ({ date: day.date, clientId: "", doctorId: "" })) }));
}

export function scheduleIsComplete(schedule: ScheduledClinicalVisit[]) {
  return schedule.length === 6 && schedule.every((visit) => Boolean(visit.date && visit.clientId && visit.doctorId));
}

export function planIsComplete(plan: ScheduledPlanDay[]) {
  return plan.length === 6 && plan.every((day) => day.visits.length >= MIN_HOSPITALS_PER_DAY && day.visits.length <= MAX_HOSPITALS_PER_DAY && day.visits.every((visit) => visit.date === day.date && Boolean(visit.clientId && visit.doctorId)) && new Set(day.visits.map((visit) => visit.clientId)).size === day.visits.length);
}

export function planPayload(plan: ScheduledPlanDay[]): WorkLogPlanDay[] {
  return plan.map((day) => ({ date: day.date, visits: day.visits.map((visit) => ({ date: visit.date, clientId: Number(visit.clientId), doctorId: Number(visit.doctorId) })) }));
}

export function formatPlan(plan: ScheduledPlanDay[], clientName: (id: string) => string, doctorName: (id: string) => string) {
  return plan.map((day, index) => `Day ${index + 1} — ${day.date}\n${day.visits.map((visit) => `• ${clientName(visit.clientId)} — ${doctorName(visit.doctorId)}`).join("\n")}`).join("\n\n");
}

export function hasAtLeastHospitals(schedule: ScheduledClinicalVisit[], minimum = 3) {
  return new Set(schedule.map((visit) => visit.clientId).filter(Boolean)).size >= minimum;
}

export function scheduleAsText(schedule: ScheduledClinicalVisit[], clientName: (id: string) => string, doctorName: (id: string) => string) {
  return schedule.map((visit) => `${visit.date} — ${clientName(visit.clientId)} — ${doctorName(visit.doctorId)}`).join("\n");
}
