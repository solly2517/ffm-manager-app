export const WEEKLY_PLAN_DAYS = 6;
export const MIN_HOSPITALS_PER_DAY = 3;
export const MAX_HOSPITALS_PER_DAY = 6;
export const MIN_DAILY_DOCTOR_VISITS = 3;

export type WorkLogVisit = { date: string; clientId: number; doctorId: number };
export type WorkLogPlanDay = { date: string; visits: WorkLogVisit[] };

const dateText = (value: Date) => value.toISOString().slice(0, 10);

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

export function expectedPlanDates(weekOf: Date) {
  const monday = new Date(`${dateText(weekOf)}T12:00:00`);
  return Array.from({ length: WEEKLY_PLAN_DAYS }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return dateText(date);
  });
}

export function weeklyPlanValidationError(days: WorkLogPlanDay[], weekOf: Date) {
  const expectedDates = expectedPlanDates(weekOf);
  if (weekOf.getDay() !== 6) return "The Delegate workweek must start on Saturday.";
  if (days.length !== WEEKLY_PLAN_DAYS) return "A weekly plan must contain six consecutive days.";
  for (let index = 0; index < days.length; index += 1) {
    const day = days[index]!;
    if (day.date !== expectedDates[index]) return "Each weekly-plan day must match the selected Saturday through Thursday dates.";
    const hospitalIds = new Set<number>();
    const seenDoctorVisits = new Set<string>();
    for (const visit of day.visits) {
      if (visit.date !== day.date || !Number.isInteger(visit.clientId) || visit.clientId <= 0 || !Number.isInteger(visit.doctorId) || visit.doctorId <= 0) return "Every planned hospital requires its date, hospital, and registered doctor.";
      hospitalIds.add(visit.clientId);
      const key = `${visit.clientId}:${visit.doctorId}`;
      if (seenDoctorVisits.has(key)) return "Select each doctor only once under the same planned hospital.";
      seenDoctorVisits.add(key);
    }
    if (hospitalIds.size < MIN_HOSPITALS_PER_DAY || hospitalIds.size > MAX_HOSPITALS_PER_DAY) return `Each plan day must include ${MIN_HOSPITALS_PER_DAY} to ${MAX_HOSPITALS_PER_DAY} hospitals.`;
  }
  return null;
}

export function dailyReportValidationError(visits: WorkLogVisit[], reportDate: Date, plannedHospitalIds: number[]) {
  const reportDateText = dateText(reportDate);
  if (reportDate.getDay() === 5) return "Friday is the Delegate weekend day; daily reports are available Saturday through Thursday.";
  if (visits.length < MIN_DAILY_DOCTOR_VISITS) return `Record at least ${MIN_DAILY_DOCTOR_VISITS} doctor visits in the daily report.`;
  if (!plannedHospitalIds.length) return "No submitted weekly plan covers this report date. Submit the plan first.";
  const allowedHospitals = new Set(plannedHospitalIds);
  const seenDoctorVisits = new Set<string>();
  for (const visit of visits) {
    if (visit.date !== reportDateText || !Number.isInteger(visit.clientId) || visit.clientId <= 0 || !Number.isInteger(visit.doctorId) || visit.doctorId <= 0) return "Every doctor visit needs a report date, hospital, and registered doctor.";
    if (!allowedHospitals.has(visit.clientId)) return "Daily reports may include only hospitals planned for that date.";
    const key = `${visit.clientId}:${visit.doctorId}`;
    if (seenDoctorVisits.has(key)) return "Record each doctor only once per daily report.";
    seenDoctorVisits.add(key);
  }
  return null;
}

export function planDayForDate(days: WorkLogPlanDay[], date: string) {
  return days.find((day) => day.date === date);
}

export function parseWeeklySchedule(value: string | null | undefined): WorkLogPlanDay[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((day) => {
      if (!day || typeof day !== "object" || !Array.isArray((day as { visits?: unknown }).visits) || typeof (day as { date?: unknown }).date !== "string") return [];
      const normalized = (day as { date: string; visits: unknown[] }).visits.flatMap((visit) => {
        if (!visit || typeof visit !== "object") return [];
        const item = visit as Partial<WorkLogVisit>;
        return typeof item.date === "string" && typeof item.clientId === "number" && typeof item.doctorId === "number" ? [{ date: item.date, clientId: item.clientId, doctorId: item.doctorId }] : [];
      });
      return [{ date: (day as { date: string }).date, visits: normalized }];
    });
  } catch {
    return [];
  }
}
