export type SaudiHoliday = { date: string; name: string; source: "fixed" | "annual_schedule" };

const annualEidWindows: Record<number, Array<{ name: string; from: string; to: string }>> = {
  2026: [
    { name: "Eid al-Fitr", from: "2026-03-17", to: "2026-03-23" },
    { name: "Eid al-Adha", from: "2026-05-24", to: "2026-05-28" },
  ],
  2027: [
    { name: "Eid al-Fitr", from: "2027-03-07", to: "2027-03-11" },
    { name: "Eid al-Adha", from: "2027-05-16", to: "2027-05-20" },
  ],
  2028: [
    { name: "Eid al-Fitr", from: "2028-02-27", to: "2028-03-02" },
    { name: "Eid al-Adha", from: "2028-05-03", to: "2028-05-09" },
  ],
  2029: [
    { name: "Eid al-Fitr", from: "2029-02-12", to: "2029-02-18" },
    { name: "Eid al-Adha", from: "2029-04-22", to: "2029-04-26" },
  ],
};

function shiftIsoDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function allDays(from: string, to: string) {
  const dates: string[] = [];
  for (let date = from; date <= to; date = shiftIsoDate(date, 1)) dates.push(date);
  return dates;
}

export function saudiHolidaysForRange(from: string, to: string): SaudiHoliday[] {
  const startYear = Number(from.slice(0, 4));
  const endYear = Number(to.slice(0, 4));
  const holidays: SaudiHoliday[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    holidays.push({ date: `${year}-02-22`, name: "Saudi Founding Day", source: "fixed" });
    holidays.push({ date: `${year}-09-23`, name: "Saudi National Day", source: "fixed" });
    for (const window of annualEidWindows[year] ?? []) {
      holidays.push(...allDays(window.from, window.to).map(date => ({ date, name: window.name, source: "annual_schedule" as const })));
    }
  }
  return holidays.filter(holiday => holiday.date >= from && holiday.date <= to);
}
