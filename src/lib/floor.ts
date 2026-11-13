import { getBooking } from "./bookings";
import { q, tx } from "./db";
import { fail } from "./http";
import { clock, dhaka } from "./time";

export type TableRow = {
  id: number;
  label: string;
  seats: number;
  zone: string;
  status: "free" | "occupied" | "cleaning";
  party_kind: "booking" | "queue" | "walkin" | null;
  party_ref: string | null;
  party_name: string | null;
  party_size: number | null;
  since: number | null;
};

export const listTables = () =>
  q.all<TableRow>("SELECT * FROM tables ORDER BY id");

type Party =
  | { kind: "booking"; code: string }
  | { kind: "queue"; id: string }
  | { kind: "walkin"; party: number };

export function seat(tableId: number, party: Party) {
  return tx(() => {
    const table =
      q.get<TableRow>("SELECT * FROM tables WHERE id = ?", tableId) ??
      fail(404, "Table not found");
    if (table.status !== "free") fail(409, `${table.label} is not free`);
    const now = clock();
    let ref = "",
      name = "Walk-in",
      size = 0;

    if (party.kind === "booking") {
      const b = getBooking(party.code) ?? fail(404, "Booking not found");
      if (b.day !== dhaka().day) fail(409, "This booking is for another day");
      if (b.status !== "booked" && b.status !== "arrived")
        fail(409, `Booking is ${b.status.replace("_", "-")}`);
      q.run(
        "UPDATE bookings SET status = 'seated', table_id = ?, seated_at = ?, arrived_at = COALESCE(arrived_at, ?) WHERE code = ?",
        tableId,
        now,
        now,
        b.code,
      );
      [ref, name, size] = [b.code, b.name, b.party];
    } else if (party.kind === "queue") {
      const t =
        q.get<{
          id: string;
          token: number;
          name: string;
          party: number;
          status: string;
        }>("SELECT * FROM queue WHERE id = ?", party.id) ??
        fail(404, "Ticket not found");
      if (t.status !== "waiting" && t.status !== "called")
        fail(409, `Ticket #${t.token} is ${t.status}`);
      q.run(
        "UPDATE queue SET status = 'seated', table_id = ?, seated_at = ? WHERE id = ?",
        tableId,
        now,
        t.id,
      );
      [ref, name, size] = [t.id, `#${t.token} ${t.name}`, t.party];
    } else {
      size = party.party;
    }
    if (size > table.seats)
      fail(409, `${table.label} seats ${table.seats}, party is ${size}`);
    q.run(
      "UPDATE tables SET status = 'occupied', party_kind = ?, party_ref = ?, party_name = ?, party_size = ?, since = ? WHERE id = ?",
      party.kind,
      ref,
      name,
      size,
      now,
      tableId,
    );
  });
}

/** Guest leaves: table goes to cleaning, their booking / ticket is closed. */
export function clearTable(tableId: number) {
  tx(() => {
    const t =
      q.get<TableRow>("SELECT * FROM tables WHERE id = ?", tableId) ??
      fail(404, "Table not found");
    if (t.status !== "occupied") fail(409, `${t.label} is not occupied`);
    if (t.party_kind === "booking")
      q.run(
        "UPDATE bookings SET status = 'completed' WHERE code = ?",
        t.party_ref,
      );
    if (t.party_kind === "queue")
      q.run("UPDATE queue SET status = 'done' WHERE id = ?", t.party_ref);
    q.run(
      "UPDATE tables SET status = 'cleaning', since = ?, party_kind = NULL, party_ref = NULL, party_name = NULL, party_size = NULL WHERE id = ?",
      clock(),
      tableId,
    );
  });
}

export function tableReady(tableId: number) {
  const r = q.run(
    "UPDATE tables SET status = 'free', since = NULL WHERE id = ? AND status = 'cleaning'",
    tableId,
  );
  if (!r.changes) fail(409, "Table is not being cleaned");
}
