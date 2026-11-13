// Core business rules against a throwaway in-memory database, clock fixed at 08:00 Dhaka.
process.env.DB_FILE = ":memory:";
process.env.DEMO_CLOCK = "08:00";
import { test } from "node:test";
import assert from "node:assert/strict";

const { availability, bookableDays, cancelBooking, createBooking, rescheduleBooking } = await import("../src/lib/bookings");
const { clearTable, listTables, seat, tableReady } = await import("../src/lib/floor");
const { callNext, joinQueue, ticket } = await import("../src/lib/queue");
const { listMenu, placeOrder, pickupWindows, setOrderStatus } = await import("../src/lib/orders");
const { HttpError } = await import("../src/lib/http");

const phone = (i: number) => `017${String(i).padStart(8, "0")}`;
const status = (fn: () => unknown) => {
  try { fn(); return 200; } catch (e) { if (e instanceof HttpError) return e.status; throw e; }
};

test("bookings never exceed online capacity; pairs spill to bigger tables", () => {
  const day = bookableDays()[1];
  const slot = availability(day)[0];
  let n = 0;
  while (status(() => createBooking({ day, slot: slot.slot, party: 2, name: "Guest", phone: phone(n) })) === 200) n++;
  assert.equal(n, slot.total, "every online table in the slot is bookable by pairs");
  assert.equal(availability(day)[0].free, 0);
  assert.equal(status(() => createBooking({ day, slot: slot.slot, party: 1, name: "Late", phone: phone(999) })), 409);
});

test("one booking per phone per day; cancel and reschedule", () => {
  const day = bookableDays()[2];
  const [a, b] = availability(day);
  const bk = createBooking({ day, slot: a.slot, party: 3, name: "Nusrat", phone: phone(5000) });
  assert.equal(bk.seats, 4);
  assert.equal(status(() => createBooking({ day, slot: b.slot, party: 2, name: "Nusrat", phone: phone(5000) })), 409);
  assert.equal(status(() => rescheduleBooking(bk.code, phone(1), day, b.slot, 3)), 404, "wrong phone");
  assert.equal(rescheduleBooking(bk.code, phone(5000), day, b.slot, 5).seats, 6);
  cancelBooking(bk.code, phone(5000));
  assert.equal(status(() => cancelBooking(bk.code, phone(5000))), 409, "already cancelled");
});

test("bookings for a slot that already started are refused", () => {
  const today = bookableDays()[0];
  const started = availability(today).find((s) => s.past)!;
  assert.equal(status(() => createBooking({ day: today, slot: started.slot, party: 2, name: "A", phone: phone(7000) })), 400);
});

test("floor: seat, clear, clean; no double seating; size check", () => {
  const today = bookableDays()[0];
  const slot = availability(today).find((s) => !s.past)!.slot;
  const bk = createBooking({ day: today, slot, party: 4, name: "Arif", phone: phone(8000) });
  const two = listTables().find((t) => t.seats === 2)!;
  const four = listTables().find((t) => t.seats === 4)!;
  assert.equal(status(() => seat(two.id, { kind: "booking", code: bk.code })), 409, "party of 4 on a 2-top");
  seat(four.id, { kind: "booking", code: bk.code });
  assert.equal(status(() => seat(four.id, { kind: "walkin", party: 2 })), 409, "table taken");
  clearTable(four.id);
  assert.equal(listTables().find((t) => t.id === four.id)!.status, "cleaning");
  tableReady(four.id);
  assert.equal(listTables().find((t) => t.id === four.id)!.status, "free");
});

test("queue: tokens in order, position, call next, one active ticket per phone", () => {
  const a = joinQueue({ name: "Rahim", phone: phone(9001), party: 2 });
  const b = joinQueue({ name: "Karim", phone: phone(9002), party: 3 });
  assert.equal(b.token, a.token + 1);
  assert.equal(ticket(b.id)!.ahead, 1);
  assert.equal(status(() => joinQueue({ name: "Rahim", phone: phone(9001), party: 2 })), 409);
  assert.equal(callNext().id, a.id);
  assert.equal(ticket(b.id)!.ahead, 0);
  assert.equal("phone" in ticket(a.id)!, false, "public ticket hides phone");
});

test("takeaway: stock can't go negative; cancel returns stock", () => {
  const paya = listMenu().find((m) => m.name === "Khasi'r Paya")!;
  const pickup = pickupWindows().find((w) => !w.past)!.time;
  const o = placeOrder({ name: "Sadia", phone: phone(9100), pickup, items: [{ id: paya.id, qty: 3 }] });
  assert.equal(o.total, paya.price * 3);
  assert.equal(listMenu().find((m) => m.id === paya.id)!.remaining, paya.remaining - 3);
  assert.equal(status(() => placeOrder({ name: "Big", phone: phone(9101), pickup, items: [{ id: paya.id, qty: paya.remaining }] })), 409);
  setOrderStatus(o.code, "cancelled");
  assert.equal(listMenu().find((m) => m.id === paya.id)!.remaining, paya.remaining);
  assert.equal(status(() => setOrderStatus(o.code, "ready")), 409, "cancelled is final");
});
