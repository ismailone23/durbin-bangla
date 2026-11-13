import { q } from "./db";
import { addDays, dhaka, hhmm, toMin } from "./time";

export function insights(days = 7) {
  const today = dhaka().day;
  const from = addDays(today, -(days - 1));
  const range = Array.from({ length: days }, (_, i) => addDays(from, i));

  const b = q.all<{ day: string; status: string; n: number; covers: number }>(
    "SELECT day, status, COUNT(*) AS n, SUM(party) AS covers FROM bookings WHERE day BETWEEN ? AND ? GROUP BY day, status",
    from,
    today,
  );
  const w = q.all<{
    day: string;
    joined: number;
    seated: number;
    seatedCovers: number;
    wait: number | null;
  }>(
    `SELECT day, COUNT(*) AS joined, SUM(seated_at IS NOT NULL) AS seated, SUM(CASE WHEN seated_at IS NOT NULL THEN party ELSE 0 END) AS seatedCovers,
            AVG(CASE WHEN seated_at IS NOT NULL THEN (seated_at - created_at) / 60000.0 END) AS wait
     FROM queue WHERE day BETWEEN ? AND ? GROUP BY day`,
    from,
    today,
  );
  const o = q.all<{ day: string; n: number; revenue: number }>(
    "SELECT day, COUNT(*) AS n, SUM(total) AS revenue FROM orders WHERE day BETWEEN ? AND ? AND status != 'cancelled' GROUP BY day",
    from,
    today,
  );

  const perDay = range.map((day) => {
    const rows = b.filter((r) => r.day === day);
    const sum = (
      f: (r: (typeof rows)[number]) => boolean,
      k: "n" | "covers" = "n",
    ) => rows.filter(f).reduce((a, r) => a + r[k], 0);
    const booked = sum((r) => r.status !== "cancelled");
    const showed = sum((r) =>
      ["arrived", "seated", "completed"].includes(r.status),
    );
    const noShow = sum((r) => r.status === "no_show");
    const qd = w.find((r) => r.day === day);
    const od = o.find((r) => r.day === day);
    return {
      day,
      booked,
      showed,
      noShow,
      covers:
        sum(
          (r) => r.status !== "cancelled" && r.status !== "no_show",
          "covers",
        ) + (qd?.seatedCovers ?? 0),
      walkins: qd?.joined ?? 0,
      walkinsSeated: qd?.seated ?? 0,
      avgWait: qd?.wait ? Math.round(qd.wait) : null,
      pickups: od?.n ?? 0,
      revenue: od?.revenue ?? 0,
    };
  });

  // When do walk-ins turn up? 15-minute buckets over the whole range.
  const arrivals = q.all<{ created_at: number }>(
    "SELECT created_at FROM queue WHERE day BETWEEN ? AND ?",
    from,
    today,
  );
  const buckets = new Map<string, number>();
  for (const { created_at } of arrivals) {
    const m = dhaka(created_at).minutes;
    const k = hhmm(m - (m % 15));
    buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  const arrivalCurve = [...buckets]
    .sort(([a], [b]) => toMin(a) - toMin(b))
    .map(([time, n]) => ({ time, avg: +(n / days).toFixed(1) }));

  const top = q.all<{ name: string; qty: number }>(
    `SELECT m.name, SUM(oi.qty) AS qty FROM order_items oi JOIN orders o ON o.code = oi.order_code JOIN menu m ON m.id = oi.item_id
     WHERE o.day BETWEEN ? AND ? AND o.status != 'cancelled' GROUP BY m.id ORDER BY qty DESC LIMIT 5`,
    from,
    today,
  );

  const t = perDay.reduce(
    (a, d) => ({
      booked: a.booked + d.booked,
      showed: a.showed + d.showed,
      noShow: a.noShow + d.noShow,
      walkins: a.walkins + d.walkins,
      pickups: a.pickups + d.pickups,
      revenue: a.revenue + d.revenue,
      covers: a.covers + d.covers,
    }),
    {
      booked: 0,
      showed: 0,
      noShow: 0,
      walkins: 0,
      pickups: 0,
      revenue: 0,
      covers: 0,
    },
  );
  const waits = perDay.filter((d) => d.avgWait !== null);
  return {
    perDay,
    arrivalCurve,
    top,
    totals: {
      ...t,
      showRate:
        t.showed + t.noShow
          ? Math.round((t.showed / (t.showed + t.noShow)) * 100)
          : null,
      avgWait: waits.length
        ? Math.round(waits.reduce((a, d) => a + d.avgWait!, 0) / waits.length)
        : null,
    },
  };
}
