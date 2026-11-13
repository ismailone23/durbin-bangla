import { q, tx } from "./db";
import { fail, isUnique, makeCode } from "./http";
import { getSettings, type Settings } from "./settings";
import { addDays, at, clock, dhaka, hhmm, toMin } from "./time";

export type BookingStatus =
  | "booked"
  | "arrived"
  | "seated"
  | "completed"
  | "no_show"
  | "cancelled";
export type Booking = {
  code: string;
  day: string;
  slot: string;
  party: number;
  seats: number;
  name: string;
  phone: string;
  status: BookingStatus;
  table_id: number | null;
  created_at: number;
  arrived_at: number | null;
  seated_at: number | null;
};

export function slotsFor(s: Settings = getSettings()) {
  const out: string[] = [];
  for (let m = s.openMin; m <= s.lastSlotMin; m += s.slotMin) out.push(hhmm(m));
  return out;
}

export function bookableDays(s: Settings = getSettings()) {
  const today = dhaka().day;
  return Array.from({ length: s.daysAhead }, (_, i) => addDays(today, i));
}

/** Tables per size that can be booked online in each slot. */
function capacity(s: Settings) {
  const rows = q.all<{ seats: number; n: number }>(
    "SELECT seats, COUNT(*) AS n FROM tables GROUP BY seats ORDER BY seats",
  );
  return new Map(rows.map((r) => [r.seats, Math.floor(r.n * s.onlineShare)]));
}

export function availability(day: string, exceptCode = "") {
  const s = getSettings();
  const cap = capacity(s);
  const now = dhaka();
  const used = q.all<{ slot: string; seats: number; n: number }>(
    "SELECT slot, seats, COUNT(*) AS n FROM bookings WHERE day = ? AND status != 'cancelled' AND code != ? GROUP BY slot, seats",
    day,
    exceptCode,
  );
  return slotsFor(s).map((slot) => {
    const left: Record<number, number> = {};
    let free = 0,
      total = 0;
    for (const [seats, n] of cap) {
      left[seats] = Math.max(
        0,
        n - (used.find((u) => u.slot === slot && u.seats === seats)?.n ?? 0),
      );
      free += left[seats];
      total += n;
    }
    return {
      slot,
      left,
      free,
      total,
      past: day < now.day || (day === now.day && toMin(slot) <= now.minutes),
    };
  });
}

/** Smallest table size that fits the party and still has room; larger tables are the fallback. */
function pickSeats(day: string, slot: string, party: number, exceptCode = "") {
  const s =
    availability(day, exceptCode).find((x) => x.slot === slot) ??
    fail(400, "Unknown time slot");
  if (s.past) fail(400, "That time has already started. Pick a later slot.");
  const size = Object.keys(s.left)
    .map(Number)
    .sort((a, b) => a - b)
    .find((seats) => seats >= party && s.left[seats] > 0);
  return (
    size ?? fail(409, "That time just filled up. Please pick another slot.")
  );
}

function checkDay(day: string, s: Settings) {
  if (!bookableDays(s).includes(day))
    fail(400, `Bookings open ${s.daysAhead} days ahead`);
}

export function createBooking(input: {
  day: string;
  slot: string;
  party: number;
  name: string;
  phone: string;
}) {
  const s = getSettings();
  if (!s.bookingOpen) fail(403, "Online booking is paused right now");
  checkDay(input.day, s);
  if (input.party < 1 || input.party > s.maxParty)
    fail(
      400,
      `Online booking is for 1–${s.maxParty} people. Larger groups, please call us.`,
    );
  try {
    return tx(() => {
      const seats = pickSeats(input.day, input.slot, input.party);
      const code = makeCode();
      q.run(
        "INSERT INTO bookings (code, day, slot, party, seats, name, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        code,
        input.day,
        input.slot,
        input.party,
        seats,
        input.name,
        input.phone,
        clock(),
      );
      return getBooking(code)!;
    });
  } catch (e) {
    if (isUnique(e, "bookings.phone"))
      fail(
        409,
        "This number already has a booking that day. Change it from your booking page.",
      );
    throw e;
  }
}

export const getBooking = (code: string) =>
  q.get<Booking>("SELECT * FROM bookings WHERE code = ?", code.toUpperCase());

function ownBooking(code: string, phone: string) {
  const b = getBooking(code);
  if (!b || b.phone !== phone)
    fail(404, "No booking found for that code and phone number");
  if (b!.status !== "booked")
    fail(409, "This booking can no longer be changed");
  return b!;
}

export function cancelBooking(code: string, phone: string) {
  const b = ownBooking(code, phone);
  q.run("UPDATE bookings SET status = 'cancelled' WHERE code = ?", b.code);
}

export function rescheduleBooking(
  code: string,
  phone: string,
  day: string,
  slot: string,
  party: number,
) {
  const s = getSettings();
  checkDay(day, s);
  if (party < 1 || party > s.maxParty)
    fail(400, `Online booking is for 1–${s.maxParty} people`);
  try {
    return tx(() => {
      const b = ownBooking(code, phone);
      const seats = pickSeats(day, slot, party, b.code);
      q.run(
        "UPDATE bookings SET day = ?, slot = ?, party = ?, seats = ? WHERE code = ?",
        day,
        slot,
        party,
        seats,
        b.code,
      );
      return getBooking(b.code)!;
    });
  } catch (e) {
    if (isUnique(e, "bookings.phone"))
      fail(409, "This number already has another booking that day");
    throw e;
  }
}

export const bookingsOn = (day: string) =>
  q.all<Booking & { table_label: string | null }>(
    "SELECT b.*, t.label AS table_label FROM bookings b LEFT JOIN tables t ON t.id = b.table_id WHERE b.day = ? ORDER BY b.slot, b.created_at",
    day,
  );

export function setBookingStatus(
  code: string,
  status: "booked" | "arrived" | "no_show" | "cancelled",
) {
  const b = getBooking(code) ?? fail(404, "Booking not found");
  if (b.status === "seated")
    fail(409, "Guest is seated. Clear the table from the floor plan instead.");
  q.run(
    "UPDATE bookings SET status = ?, arrived_at = CASE WHEN ? = 'arrived' THEN ? ELSE arrived_at END WHERE code = ?",
    status,
    status,
    clock(),
    b.code,
  );
}

/** Late = slot started more than graceMin ago and guest has not arrived. */
export function isLate(
  b: Pick<Booking, "day" | "slot" | "status">,
  s: Settings = getSettings(),
) {
  return (
    b.status === "booked" && clock() > at(b.day, b.slot) + s.graceMin * 60e3
  );
}
