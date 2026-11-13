// The menu book's layout: every dish once, in order, in at most 8 columns of similar height.
import { test } from "node:test";
import assert from "node:assert/strict";

const { heights, paginate, ROW_SIZES } = await import("../src/lib/menu-layout");

// The real menu, as the app seeds it.
process.env.DB_FILE = ":memory:";
const { listMenu } = await import("../src/lib/orders");
const menu = listMenu().filter((m) => m.active);
const sections = [...menu.reduce((m, d) => m.set(d.category, [...(m.get(d.category) ?? []), d]), new Map<string, typeof menu>()).entries()];

test("every dish appears once, in printed order, in at most 8 columns", () => {
  const cols = paginate(sections);
  assert.ok(cols.length <= 8 && cols.length >= 2, `got ${cols.length} columns`);
  const laid = cols.flat().flatMap((b) => (b.kind === "section" ? b.dishes.map((d) => d.id) : []));
  assert.deepEqual(laid, menu.map((d) => d.id));
  assert.equal(cols[0][0].kind, "cover");
  assert.equal(cols.at(-1)!.at(-1)!.kind, "info");
});

test("no heading is left without dishes, and a section continues under a 'continued' heading", () => {
  const blocks = paginate(sections).flat().filter((b) => b.kind === "section");
  const size = new Map(sections.map(([name, ds]) => [name, ds.length]));
  for (const b of blocks) {
    if (b.kind !== "section") continue;
    assert.ok(b.dishes.length >= Math.min(3, size.get(b.name)!), `${b.name}: only ${b.dishes.length} dishes under a heading`);
  }
  const seen = new Set<string>();
  for (const b of blocks) if (b.kind === "section") { assert.equal(b.cont, seen.has(b.name)); seen.add(b.name); }
});

test("sections of five dishes or fewer are never split", () => {
  const parts = new Map<string, number>();
  for (const b of paginate(sections).flat()) if (b.kind === "section") parts.set(b.name, (parts.get(b.name) ?? 0) + 1);
  for (const [name, ds] of sections) if (ds.length <= 5) assert.equal(parts.get(name), 1, name);
});

test("columns come out close in height", () => {
  const h = heights(paginate(sections), ROW_SIZES);
  const avg = h.reduce((a, b) => a + b) / h.length;
  assert.ok(Math.max(...h) <= avg * 1.35, `tallest column ${Math.max(...h)} vs average ${avg.toFixed(1)}: ${h.join(", ")}`);
});
