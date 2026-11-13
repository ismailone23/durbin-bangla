// Read models for the pages that poll: public home, gate TV board, staff console.
import { availability, bookingsOn, isLate, slotsFor } from "./bookings";
import { listTables } from "./floor";
import { listMenu, ordersOn } from "./orders";
import { queueOn, queueSummary } from "./queue";
import { getSettings } from "./settings";
import { addDays, dhaka, toMin } from "./time";

export function nextOpenSlot() {
  const today = dhaka().day;
  for (const day of [today, addDays(today, 1), addDays(today, 2)]) {
    const s = availability(day).find((x) => !x.past && x.free > 0);
    if (s) return { day, slot: s.slot, free: s.free };
  }
  return null;
}

export function publicStatus() {
  const s = getSettings();
  const { minutes, ms } = dhaka();
  const menu = listMenu().filter((m) => m.active);
  return {
    now: ms,
    serviceOpen: minutes >= s.openMin && minutes < s.closeMin,
    queue: queueSummary(),
    nextSlot: nextOpenSlot(),
    signatures: menu
      .filter((m) => m.signature)
      .map(({ id, name, name_bn, remaining, daily_stock }) => ({
        id,
        name,
        name_bn,
        remaining,
        daily_stock,
      })),
    soldOut: menu.filter((m) => m.remaining === 0).map((m) => m.name),
    hours: { open: s.openMin, close: s.closeMin },
  };
}

export function boardData() {
  const { day } = dhaka();
  const queue = queueOn(day);
  const status = publicStatus();
  return {
    ...status,
    called: queue
      .filter((t) => t.status === "called")
      .map((t) => ({ token: t.token, at: t.called_at })),
    next: queue
      .filter((t) => t.status === "waiting")
      .slice(0, 8)
      .map((t) => t.token),
    ready: ordersOn(day)
      .filter((o) => o.status === "ready")
      .map((o) => o.code),
  };
}

export function staffOverview() {
  const s = getSettings();
  const { day, minutes, ms } = dhaka();
  const bookings = bookingsOn(day).map((b) => ({ ...b, late: isLate(b, s) }));
  const slots = slotsFor(s);
  const current =
    [...slots].reverse().find((x) => toMin(x) <= minutes) ?? slots[0];
  const upcoming = slots.find((x) => toMin(x) > minutes) ?? null;
  return {
    now: ms,
    day,
    settings: s,
    tables: listTables(),
    bookings,
    queue: queueOn(day),
    orders: ordersOn(day),
    menu: listMenu(),
    currentSlot: current,
    upcomingSlot: upcoming,
    queueSummary: queueSummary(day),
  };
}
