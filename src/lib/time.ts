// Dhaka is UTC+6 all year (no DST). DEMO_CLOCK=HH:MM makes the app run as if it is that time today,
// so the system can be demoed with a live morning rush at any hour.
const OFFSET = 6 * 3600e3;
const g = globalThis as unknown as { __clockShift?: number };

function shift() {
  if (g.__clockShift !== undefined) return g.__clockShift;
  const demo = process.env.DEMO_CLOCK?.match(/^(\d{1,2}):(\d{2})$/);
  if (!demo) return (g.__clockShift = 0);
  const real = new Date(Date.now() + OFFSET);
  const realMs = ((real.getUTCHours() * 60 + real.getUTCMinutes()) * 60 + real.getUTCSeconds()) * 1e3 + real.getUTCMilliseconds();
  return (g.__clockShift = (+demo[1] * 60 + +demo[2]) * 60e3 - realMs);
}

/** Epoch ms, shifted by DEMO_CLOCK when set. Use for every stored timestamp. */
export const clock = () => Date.now() + shift();

export function dhaka(ms = clock()) {
  const d = new Date(ms + OFFSET);
  return { day: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes(), ms };
}

export const addDays = (day: string, n: number) => new Date(Date.parse(day) + n * 864e5).toISOString().slice(0, 10);
export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const toMin = (s: string) => +s.slice(0, 2) * 60 + +s.slice(3, 5);
/** Epoch ms of a Dhaka wall-clock time. */
export const at = (day: string, time: string) => Date.parse(`${day}T${time}:00+06:00`);
