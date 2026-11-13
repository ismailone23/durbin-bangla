import { z } from "zod";
import { q } from "./db";

export const settingsSchema = z.object({
  openMin: z.number().int().min(0).max(1439), // first slot / doors open
  lastSlotMin: z.number().int().min(0).max(1439), // last bookable slot start
  closeMin: z.number().int().min(0).max(1439), // breakfast service ends
  slotMin: z.number().int().min(15).max(120), // keep >= avgStayMin or tables get double-booked
  avgStayMin: z.number().int().min(10).max(120),
  onlineShare: z.number().min(0).max(1), // share of tables bookable online, rest for walk-ins
  daysAhead: z.number().int().min(1).max(14),
  graceMin: z.number().int().min(0).max(60),
  maxParty: z.number().int().min(1).max(12),
  pickupWindowMin: z.number().int().min(5).max(60),
  pickupCap: z.number().int().min(1).max(500), // takeaway orders per pickup window
  bookingOpen: z.boolean(),
  queueOpen: z.boolean(),
  ordersOpen: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULTS: Settings = {
  openMin: 7 * 60, // restaurant opens 7 am (Fri 6:30)
  lastSlotMin: 11 * 60,
  closeMin: 12 * 60,
  slotMin: 45,
  avgStayMin: 40,
  onlineShare: 0.7,
  daysAhead: 3,
  graceMin: 10,
  maxParty: 6,
  pickupWindowMin: 15,
  pickupCap: 20,
  bookingOpen: true,
  queueOpen: true,
  ordersOpen: true,
};

export function getSettings(): Settings {
  const row = q.get<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'main'",
  );
  return { ...DEFAULTS, ...(row ? JSON.parse(row.value) : {}) };
}

export function saveSettings(patch: Partial<Settings>) {
  const next = settingsSchema.parse({ ...getSettings(), ...patch });
  if (next.lastSlotMin < next.openMin || next.closeMin <= next.openMin)
    throw new Error("Opening hours are out of order");
  q.run(
    "INSERT INTO settings (key, value) VALUES ('main', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    JSON.stringify(next),
  );
  return next;
}
