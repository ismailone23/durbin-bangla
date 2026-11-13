import { q, tx } from "./db";
import { fail, makeCode } from "./http";
import { getSettings } from "./settings";
import { at, clock, dhaka, hhmm } from "./time";

export type MenuItem = {
  id: number;
  name: string;
  name_bn: string;
  description: string;
  category: string;
  price: number;
  daily_stock: number;
  remaining: number;
  takeaway: number;
  active: number;
  signature: number;
};
export type OrderStatus =
  | "placed"
  | "preparing"
  | "ready"
  | "collected"
  | "cancelled";
export type Order = {
  code: string;
  day: string;
  pickup: string;
  name: string;
  phone: string;
  status: OrderStatus;
  total: number;
  created_at: number;
  updated_at: number;
};

/** Stock resets to daily_stock the first time the menu is read on a new day. */
export function listMenu() {
  const { day } = dhaka();
  q.run(
    "UPDATE menu SET remaining = daily_stock, stock_day = ? WHERE stock_day != ?",
    day,
    day,
  );
  return q.all<MenuItem>(
    "SELECT * FROM menu ORDER BY (SELECT MIN(id) FROM menu m2 WHERE m2.category = menu.category), id",
  );
}

export function updateMenuItem(
  id: number,
  patch: {
    remaining?: number;
    active?: boolean;
    dailyStock?: number;
    price?: number;
  },
) {
  listMenu();
  const item =
    q.get<MenuItem>("SELECT * FROM menu WHERE id = ?", id) ??
    fail(404, "Item not found");
  q.run(
    "UPDATE menu SET remaining = ?, active = ?, daily_stock = ?, price = ? WHERE id = ?",
    Math.max(0, patch.remaining ?? item.remaining),
    patch.active === undefined ? item.active : patch.active ? 1 : 0,
    Math.max(0, patch.dailyStock ?? item.daily_stock),
    Math.max(0, patch.price ?? item.price),
    id,
  );
}

const LEAD_MIN = 15; // kitchen needs at least this long

export function pickupWindows() {
  const s = getSettings();
  const now = dhaka();
  const used = q.all<{ pickup: string; n: number }>(
    "SELECT pickup, COUNT(*) AS n FROM orders WHERE day = ? AND status != 'cancelled' GROUP BY pickup",
    now.day,
  );
  const out = [];
  for (let m = s.openMin; m < s.closeMin; m += s.pickupWindowMin) {
    const time = hhmm(m);
    const n = used.find((u) => u.pickup === time)?.n ?? 0;
    out.push({
      time,
      left: Math.max(0, s.pickupCap - n),
      past: m < now.minutes + LEAD_MIN,
    });
  }
  return out;
}

export function placeOrder(input: {
  name: string;
  phone: string;
  pickup: string;
  items: { id: number; qty: number }[];
}) {
  const s = getSettings();
  if (!s.ordersOpen) fail(403, "Takeaway pre-orders are paused right now");
  if (!input.items.length) fail(400, "Your bag is empty");
  const window =
    pickupWindows().find((w) => w.time === input.pickup) ??
    fail(400, "Pick a pickup time");
  if (window.past) fail(400, "That pickup time is too soon. Pick a later one.");
  const { day } = dhaka();
  listMenu();
  return tx(() => {
    if (
      q.get<{ n: number }>(
        "SELECT COUNT(*) AS n FROM orders WHERE day = ? AND pickup = ? AND status != 'cancelled'",
        day,
        input.pickup,
      )!.n >= s.pickupCap
    )
      fail(409, "That pickup time just filled up. Pick another.");
    const active = q.get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM orders WHERE day = ? AND phone = ? AND status IN ('placed', 'preparing', 'ready')",
      day,
      input.phone,
    )!.n;
    if (active >= 2) fail(409, "This number already has 2 open orders today");

    const code = makeCode();
    const now = clock();
    let total = 0;
    const lines: [number, number, number][] = [];
    for (const { id, qty } of input.items) {
      const item =
        q.get<MenuItem>("SELECT * FROM menu WHERE id = ?", id) ??
        fail(400, "Unknown item");
      if (!item.active || !item.takeaway)
        fail(409, `${item.name} is not available for takeaway`);
      // Conditional decrement: two people can't buy the last portion.
      const r = q.run(
        "UPDATE menu SET remaining = remaining - ? WHERE id = ? AND remaining >= ?",
        qty,
        id,
        qty,
      );
      if (!r.changes)
        fail(
          409,
          item.remaining
            ? `Only ${item.remaining} ${item.name} left`
            : `${item.name} is sold out`,
        );
      total += item.price * qty;
      lines.push([id, qty, item.price]);
    }
    q.run(
      "INSERT INTO orders (code, day, pickup, name, phone, total, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      code,
      day,
      input.pickup,
      input.name,
      input.phone,
      total,
      now,
      now,
    );
    for (const [id, qty, price] of lines)
      q.run(
        "INSERT INTO order_items (order_code, item_id, qty, price) VALUES (?, ?, ?, ?)",
        code,
        id,
        qty,
        price,
      );
    return getOrder(code)!;
  });
}

export function getOrder(code: string) {
  const o = q.get<Order>(
    "SELECT * FROM orders WHERE code = ?",
    code.toUpperCase(),
  );
  if (!o) return undefined;
  const items = q.all<{
    name: string;
    name_bn: string;
    qty: number;
    price: number;
  }>(
    "SELECT m.name, m.name_bn, oi.qty, oi.price FROM order_items oi JOIN menu m ON m.id = oi.item_id WHERE oi.order_code = ?",
    o.code,
  );
  return { ...o, items, pickupAt: at(o.day, o.pickup) };
}

export const publicOrder = (code: string) => {
  const o = getOrder(code);
  if (!o) return undefined;
  const { phone, ...pub } = o;
  void phone;
  return pub;
};

export function ordersOn(day: string) {
  const orders = q.all<Order>(
    "SELECT * FROM orders WHERE day = ? ORDER BY pickup, created_at",
    day,
  );
  const items = q.all<{ order_code: string; name: string; qty: number }>(
    "SELECT oi.order_code, m.name, oi.qty FROM order_items oi JOIN menu m ON m.id = oi.item_id JOIN orders o ON o.code = oi.order_code WHERE o.day = ?",
    day,
  );
  return orders.map((o) => ({
    ...o,
    items: items.filter((i) => i.order_code === o.code),
  }));
}

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  placed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["collected", "preparing"],
  collected: ["ready"],
  cancelled: [],
};

export function setOrderStatus(code: string, status: OrderStatus) {
  tx(() => {
    const o = getOrder(code) ?? fail(404, "Order not found");
    if (!NEXT[o.status].includes(status))
      fail(409, `Can't move an order from ${o.status} to ${status}`);
    if (status === "cancelled") {
      // Put the portions back so others can order them.
      for (const it of q.all<{ item_id: number; qty: number }>(
        "SELECT item_id, qty FROM order_items WHERE order_code = ?",
        o.code,
      ))
        q.run(
          "UPDATE menu SET remaining = remaining + ? WHERE id = ?",
          it.qty,
          it.item_id,
        );
    }
    q.run(
      "UPDATE orders SET status = ?, updated_at = ? WHERE code = ?",
      status,
      clock(),
      o.code,
    );
  });
}
