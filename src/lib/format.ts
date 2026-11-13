export const fmtTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};
export const fmtMin = (min: number) =>
  fmtTime(
    `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`,
  );
export const fmtDay = (day: string, today?: string) => {
  const d = new Date(`${day}T00:00:00`);
  const label = d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  if (!today) return label;
  const diff = Math.round((Date.parse(day) - Date.parse(today)) / 864e5);
  return diff === 0
    ? `Today · ${label.split(" ").slice(1).join(" ")}`
    : diff === 1
      ? `Tomorrow · ${label.split(" ").slice(1).join(" ")}`
      : label;
};
export const taka = (n: number) => `৳${n.toLocaleString("en-IN")}`;
export const dhakaClock = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Dhaka",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
export const dhakaDay = (ms: number) =>
  new Date(ms + 6 * 3600e3).toISOString().slice(0, 10);
export const ago = (from: number, now: number) => {
  const m = Math.max(0, Math.floor((now - from) / 60e3));
  return m < 1
    ? "just now"
    : m < 60
      ? `${m} min`
      : `${Math.floor(m / 60)}h ${m % 60}m`;
};
