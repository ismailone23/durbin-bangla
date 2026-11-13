import { randomBytes } from "node:crypto";
import { q, tx } from "./db";
import { fail, isUnique } from "./http";
import { getSettings } from "./settings";
import { clock, dhaka } from "./time";

export type QueueStatus =
  | "waiting"
  | "called"
  | "seated"
  | "done"
  | "skipped"
  | "left";
export type Ticket = {
  id: string;
  day: string;
  token: number;
  name: string;
  phone: string;
  party: number;
  status: QueueStatus;
  table_id: number | null;
  created_at: number;
  called_at: number | null;
  seated_at: number | null;
};

export function queueIsOpen() {
  const s = getSettings();
  const { minutes } = dhaka();
  // Queue opens an hour before doors, closes 30 min before service ends.
  return s.queueOpen && minutes >= s.openMin - 60 && minutes < s.closeMin - 30;
}

/** Walk-in tables seated per minute: measured from the last 45 min, or the planned walk-in share when quiet. */
function seatRate() {
  const s = getSettings();
  const since = clock() - 45 * 60e3;
  const recent = q.get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM queue WHERE seated_at > ?",
    since,
  )!.n;
  const tables = q.get<{ n: number }>("SELECT COUNT(*) AS n FROM tables")!.n;
  const planned = Math.max(1, tables * (1 - s.onlineShare)) / s.avgStayMin;
  // Never faster than every table turning over once per average stay.
  return Math.min(Math.max(recent / 45, planned), tables / s.avgStayMin);
}

export const etaMinutes = (ahead: number) =>
  Math.max(3, Math.round((ahead + 1) / seatRate()));

export function joinQueue(input: {
  name: string;
  phone: string;
  party: number;
}) {
  if (!queueIsOpen()) fail(403, "The walk-in queue is closed right now");
  if (input.party < 1 || input.party > 12) fail(400, "Party size must be 1–12");
  const { day } = dhaka();
  try {
    return tx(() => {
      const token = q.get<{ n: number }>(
        "SELECT COALESCE(MAX(token), 0) + 1 AS n FROM queue WHERE day = ?",
        day,
      )!.n;
      const id = randomBytes(8).toString("base64url");
      q.run(
        "INSERT INTO queue (id, day, token, name, phone, party, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        id,
        day,
        token,
        input.name,
        input.phone,
        input.party,
        clock(),
      );
      return ticket(id)!;
    });
  } catch (e) {
    if (isUnique(e, "queue.phone"))
      fail(409, "This number is already in today's queue");
    throw e;
  }
}

export function ticket(id: string) {
  const t = q.get<Ticket & { table_label: string | null }>(
    "SELECT qu.*, t.label AS table_label FROM queue qu LEFT JOIN tables t ON t.id = qu.table_id WHERE qu.id = ?",
    id,
  );
  if (!t) return undefined;
  const ahead =
    t.status === "waiting"
      ? q.get<{ n: number }>(
          "SELECT COUNT(*) AS n FROM queue WHERE day = ? AND status = 'waiting' AND token < ?",
          t.day,
          t.token,
        )!.n
      : 0;
  const { phone, ...pub } = t; // never send the phone number to the public ticket page
  void phone;
  return {
    ...pub,
    ahead,
    eta: t.status === "waiting" ? etaMinutes(ahead) : 0,
    nowServing: nowServing(t.day),
  };
}

export function nowServing(day = dhaka().day) {
  return (
    q.all<{ token: number }>(
      // Highest token called so far; seated/done guests were called before.
      "SELECT MAX(token) AS token FROM queue WHERE day = ? AND status IN ('called', 'seated', 'done')",
      day,
    )[0]?.token ?? null
  );
}

export function leaveQueue(id: string) {
  const r = q.run(
    "UPDATE queue SET status = 'left' WHERE id = ? AND status IN ('waiting', 'called')",
    id,
  );
  if (!r.changes) fail(409, "This ticket is no longer active");
}

export const queueOn = (day: string) =>
  q.all<Ticket & { table_label: string | null }>(
    "SELECT qu.*, t.label AS table_label FROM queue qu LEFT JOIN tables t ON t.id = qu.table_id WHERE qu.day = ? ORDER BY qu.token",
    day,
  );

export function setTicketStatus(
  id: string,
  status: "waiting" | "called" | "skipped" | "left",
) {
  const t =
    q.get<Ticket>("SELECT * FROM queue WHERE id = ?", id) ??
    fail(404, "Ticket not found");
  if (t.status === "seated" || t.status === "done")
    fail(409, "Guest is already seated");
  q.run(
    "UPDATE queue SET status = ?, called_at = CASE WHEN ? = 'called' THEN ? ELSE called_at END WHERE id = ?",
    status,
    status,
    clock(),
    id,
  );
}

export function callNext() {
  const next =
    q.get<{ id: string; token: number }>(
      "SELECT id, token FROM queue WHERE day = ? AND status = 'waiting' ORDER BY token LIMIT 1",
      dhaka().day,
    ) ?? fail(404, "Nobody is waiting");
  setTicketStatus(next.id, "called");
  return next;
}

export function queueSummary(day = dhaka().day) {
  const waiting = q.get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM queue WHERE day = ? AND status = 'waiting'",
    day,
  )!.n;
  return {
    open: queueIsOpen(),
    waiting,
    eta: etaMinutes(waiting),
    nowServing: nowServing(day),
  };
}
