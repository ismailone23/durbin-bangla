// Fills the database with 2 weeks of realistic history plus a live morning rush "right now".
// Run: pnpm seed   (use the same DEMO_CLOCK as the server, e.g. DEMO_CLOCK=08:20)
import { slotsFor } from "../src/lib/bookings";
import { q, tx } from "../src/lib/db";
import { makeCode } from "../src/lib/http";
import { listMenu } from "../src/lib/orders";
import { getSettings } from "../src/lib/settings";
import { addDays, at, clock, dhaka, hhmm, toMin } from "../src/lib/time";

let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const NAMES = ["Rahim", "Karim", "Nusrat", "Tanvir", "Farhana", "Sabbir", "Ayesha", "Imran", "Mithila", "Rakib", "Sadia", "Fahim", "Tahmid", "Jannat", "Arif", "Lamia", "Shakil", "Riya", "Mahin", "Anika", "Zubair", "Nabila", "Hasan", "Priya", "Sajid", "Tasnim"];
const LAST = ["Ahmed", "Hossain", "Rahman", "Islam", "Chowdhury", "Khan", "Sarkar", "Uddin", "Akter", "Das"];
const name = () => `${pick(NAMES)} ${pick(LAST)}`;
let phoneN = 0;
const phone = () => `01${pick(["3", "5", "6", "7", "8", "9"])}${String(10000000 + ++phoneN * 7).padStart(8, "0")}`; // counter keeps every number unique
const code = () => makeCode();
const partySize = () => pick([1, 2, 2, 2, 3, 3, 4, 4, 4, 5, 6]);
const seatsFor = (p: number) => (p <= 2 ? 2 : p <= 4 ? 4 : 6);

const s = getSettings();
const now = dhaka();
const today = now.day;
const slots = slotsFor(s);
const tables = q.all<{ id: number; seats: number; label: string }>("SELECT id, seats, label FROM tables ORDER BY id");
const cap = new Map<number, number>();
for (const t of tables) cap.set(t.seats, (cap.get(t.seats) ?? 0) + 1);
const menu = listMenu();
const takeaway = menu.filter((m) => m.takeaway && m.active);

// Walk-in arrival curve: peaks around 7:45–8:45.
const arrivalMinute = () => {
  const u = (rnd() + rnd() + rnd()) / 3;
  return Math.round(s.openMin - 30 + u * 240); // peaks about 1h15 after opening
};

tx(() => {
  q.exec("DELETE FROM order_items; DELETE FROM orders; DELETE FROM queue; DELETE FROM bookings;");
  q.run("UPDATE tables SET status = 'free', party_kind = NULL, party_ref = NULL, party_name = NULL, party_size = NULL, since = NULL");
  q.run("UPDATE menu SET remaining = daily_stock, stock_day = ?", today);

  const insB = (day: string, slot: string, party: number, status: string, tableId: number | null = null) => {
    const start = at(day, slot);
    const c = code();
    q.run(
      "INSERT INTO bookings (code, day, slot, party, seats, name, phone, status, table_id, created_at, arrived_at, seated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      c, day, slot, party, seatsFor(party), name(), phone(), status, tableId,
      start - int(2, 40) * 3600e3,
      ["arrived", "seated", "completed"].includes(status) ? start + int(-5, 8) * 60e3 : null,
      ["seated", "completed"].includes(status) ? start + int(0, 10) * 60e3 : null,
    );
    return c;
  };
  const insQ = (day: string, token: number, created: number, status: string, wait: number, tableId: number | null = null) => {
    const id = `demo${day.replaceAll("-", "")}${token}`;
    q.run(
      "INSERT INTO queue (id, day, token, name, phone, party, status, table_id, created_at, called_at, seated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, day, token, name(), phone(), partySize(), status, tableId, created,
      ["called", "seated", "done"].includes(status) ? created + (wait - 3) * 60e3 : null,
      ["seated", "done"].includes(status) ? created + wait * 60e3 : null,
    );
    return id;
  };
  const insO = (day: string, pickup: string, status: string) => {
    const c = code();
    const lines = Array.from({ length: int(1, 3) }, () => pick(takeaway)).filter((m, i, a) => a.indexOf(m) === i).map((m) => ({ m, qty: m.price < 50 ? int(4, 12) : int(1, 4) }));
    const total = lines.reduce((a, l) => a + l.m.price * l.qty, 0);
    const created = at(day, pickup) - int(20, 180) * 60e3;
    q.run("INSERT INTO orders (code, day, pickup, name, phone, status, total, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", c, day, pickup, name(), phone(), status, total, created, created);
    for (const l of lines) q.run("INSERT INTO order_items (order_code, item_id, qty, price) VALUES (?, ?, ?, ?)", c, l.m.id, l.qty, l.m.price);
    return lines;
  };

  // ---- History: the 13 days before today ----
  for (let d = 13; d >= 1; d--) {
    const day = addDays(today, -d);
    const busy = 0.75 + rnd() * 0.25;
    for (const slot of slots) for (const [seats, n] of cap) {
      const online = Math.floor(n * s.onlineShare * busy);
      for (let i = 0; i < online; i++) {
        const party = seats === 2 ? int(1, 2) : seats === 4 ? int(3, 4) : int(5, 6);
        insB(day, slot, party, rnd() < 0.08 ? "no_show" : rnd() < 0.05 ? "cancelled" : "completed");
      }
    }
    const joins = int(260, 380);
    const ms = Array.from({ length: joins }, arrivalMinute).sort((a, b) => a - b);
    ms.forEach((m, i) => {
      const left = rnd() < 0.12;
      insQ(day, i + 1, at(day, hhmm(m)) + int(0, 59) * 1e3, left ? "left" : "done", int(12, 48));
    });
    for (let i = int(70, 110); i > 0; i--) insO(day, hhmm(s.openMin + int(0, (s.closeMin - s.openMin) / s.pickupWindowMin - 1) * s.pickupWindowMin), rnd() < 0.04 ? "cancelled" : "collected");
  }

  // ---- Today, as of the (demo) clock ----
  const M = now.minutes;
  const freeTables = [...tables];
  const takeTable = (seats: number) => {
    const i = freeTables.findIndex((t) => t.seats >= seats);
    return i < 0 ? null : freeTables.splice(i, 1)[0];
  };
  const occupy = (t: { id: number }, kind: string, ref: string, who: string, size: number, since: number) =>
    q.run("UPDATE tables SET status = 'occupied', party_kind = ?, party_ref = ?, party_name = ?, party_size = ?, since = ? WHERE id = ?", kind, ref, who, size, since, t.id);

  for (const slot of slots) {
    const start = toMin(slot);
    for (const [seats, n] of cap) {
      const online = Math.floor(n * s.onlineShare * (start > M ? 0.55 + rnd() * 0.3 : 0.9));
      for (let i = 0; i < online; i++) {
        const party = seats === 2 ? int(1, 2) : seats === 4 ? int(3, 4) : int(5, 6);
        if (start + s.slotMin <= M) insB(today, slot, party, rnd() < 0.07 ? "no_show" : "completed");
        else if (start <= M) {
          const r = rnd();
          if (r < 0.78) {
            const t = takeTable(party);
            const c = insB(today, slot, party, t ? "seated" : "arrived", t?.id ?? null);
            if (t) {
              const b = q.get<{ name: string; seated_at: number }>("SELECT name, seated_at FROM bookings WHERE code = ?", c)!;
              occupy(t, "booking", c, b.name, party, b.seated_at);
            }
          } else insB(today, slot, party, r < 0.88 ? "arrived" : "booked");
        } else insB(today, slot, party, rnd() < 0.03 ? "cancelled" : "booked");
      }
    }
  }

  if (M > s.openMin - 30) {
    const joins = 340; // whole day's arrivals; only those before the clock are kept below
    const ms = Array.from({ length: joins }, arrivalMinute).filter((m) => m <= M).sort((a, b) => a - b);
    const waitingFrom = Math.max(0, ms.length - 26);
    ms.forEach((m, i) => {
      const created = at(today, hhmm(m)) + int(0, 59) * 1e3;
      if (i >= waitingFrom + 2) return insQ(today, i + 1, created, "waiting", 0);
      if (i >= waitingFrom) return insQ(today, i + 1, created, "called", int(18, 30));
      const wait = int(14, 40);
      const seatedAt = created + wait * 60e3;
      if (clock() - seatedAt < s.avgStayMin * 60e3) {
        const party = partySize();
        const t = freeTables.length > 5 ? takeTable(party) : null; // leave a few tables free / cleaning for the demo
        if (t) {
          const id = insQ(today, i + 1, created, "seated", wait, t.id);
          q.run("UPDATE queue SET party = ? WHERE id = ?", party, id);
          return occupy(t, "queue", id, `#${i + 1} ${q.get<{ name: string }>("SELECT name FROM queue WHERE id = ?", id)!.name}`, party, seatedAt);
        }
      }
      insQ(today, i + 1, created, rnd() < 0.1 ? "left" : "done", wait);
    });
  }
  // A couple of tables being cleaned, the rest stay free.
  for (const t of freeTables.splice(0, 3)) q.run("UPDATE tables SET status = 'cleaning', since = ? WHERE id = ?", clock() - int(1, 4) * 60e3, t.id);

  for (let m = s.openMin; m < s.closeMin; m += s.pickupWindowMin) {
    const n = m + s.pickupWindowMin <= M ? int(5, 9) : m <= M + 15 ? int(6, 10) : m <= M + 90 ? int(3, 8) : int(0, 3);
    for (let i = 0; i < n; i++) {
      const status = m + s.pickupWindowMin <= M ? "collected" : m <= M ? pick(["ready", "ready", "collected"]) : m <= M + 15 ? pick(["preparing", "ready"]) : m <= M + 45 ? pick(["placed", "preparing"]) : "placed";
      for (const l of insO(today, hhmm(m), status)) q.run("UPDATE menu SET remaining = MAX(0, remaining - ?) WHERE id = ?", l.qty, l.m.id);
    }
  }
  // Dine-in eats into stock too.
  const progress = Math.max(0, Math.min(1, (M - s.openMin) / (s.closeMin - s.openMin)));
  for (const m of menu) q.run("UPDATE menu SET remaining = MAX(0, remaining - ?) WHERE id = ?", Math.round(m.daily_stock * progress * (m.signature ? 0.75 : 0.45)), m.id);
});

const c = (sql: string) => q.get<{ n: number }>(sql)!.n;
console.log(`Seeded as of ${today} ${hhmm(now.minutes)} Dhaka time:`);
console.log(`  ${c("SELECT COUNT(*) AS n FROM bookings")} bookings, ${c("SELECT COUNT(*) AS n FROM queue")} queue tickets, ${c("SELECT COUNT(*) AS n FROM orders")} orders`);
console.log(`  now: ${c("SELECT COUNT(*) AS n FROM tables WHERE status = 'occupied'")}/${tables.length} tables occupied, ${c(`SELECT COUNT(*) AS n FROM queue WHERE day = '${today}' AND status = 'waiting'`)} waiting in queue`);
