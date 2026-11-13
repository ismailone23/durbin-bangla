/** Lays the menu out like a typeset page: 8 columns of the same height. */
export type Dish = {
  id: number;
  name: string;
  category: string;
  price: number;
  remaining: number;
  signature: number;
};

export type Block =
  | { kind: "cover" }
  | { kind: "info" }
  | { kind: "photo"; src: string; alt: string; height: number }
  | { kind: "section"; name: string; cont: boolean; curved: boolean; dishes: Dish[] };

/** How tall each piece is. The page measures these in the browser at the reader's width (pixels);
 *  the defaults (in dish rows) are only for tests and the first render. */
export type Sizes = {
  cover: number;
  info: number;
  head: (name: string, curved: boolean) => number; // a section's own heading, with the space around it
  cont: (name: string) => number; // the small "continued" heading
  dish: (d: Dish) => number;
};

export const ROW_SIZES: Sizes = {
  cover: 9,
  info: 4,
  head: (_, curved) => (curved ? 2.6 : 3.6),
  cont: () => 1.4,
  dish: (d) => (d.signature || d.remaining === 0 ? 1.5 : 1),
};

const COLUMNS = 8;

/** Greedy fill at a given column height. Typesetting rules:
 *  - a heading has at least three dishes under it (never strands one or two at the foot of a column);
 *  - a section of five dishes or fewer is never split (it could not give three to each part);
 *  - a long section continues under a "continued" heading, which also starts with at least three dishes. */
function pack(sections: [string, Dish[]][], cap: number, sz: Sizes): Block[][] {
  const cols: Block[][] = [[{ kind: "cover" }]];
  let used = sz.cover;
  const room = (need: number) => {
    if (used > 0 && used + need > cap) {
      cols.push([]);
      used = 0;
      return true;
    }
    return false;
  };
  sections.forEach(([name, dishes], i) => {
    const curved = i % 2 === 0;
    let block: Extract<Block, { kind: "section" }> | null = null;
    dishes.forEach((d, j) => {
      const ahead = j === 0 && dishes.length <= 5 ? dishes : dishes.slice(j, j + 3);
      const need = block ? sz.dish(d) : (j === 0 ? sz.head(name, curved) : sz.cont(name)) + ahead.reduce((a, x) => a + sz.dish(x), 0);
      const prev: Extract<Block, { kind: "section" }> | null = block;
      if (room(need)) block = null;
      // No stray dish or two at the top of the next column: carry dishes over so it starts with three.
      const carry = prev && !block ? prev.dishes.splice(Math.max(3, prev.dishes.length - Math.max(0, 3 - (dishes.length - j)))) : [];
      if (!block) {
        block = { kind: "section", name, cont: j - carry.length > 0, curved, dishes: [] };
        cols[cols.length - 1].push(block);
        used += block.cont ? sz.cont(name) : sz.head(name, curved);
        for (const c of carry) {
          block.dishes.push(c);
          used += sz.dish(c);
        }
      }
      block.dishes.push(d);
      used += sz.dish(d);
    });
  });
  room(sz.info);
  cols[cols.length - 1].push({ kind: "info" });
  return cols;
}

/** Height of each column under these sizes. */
export function heights(cols: Block[][], sz: Sizes): number[] {
  return cols.map((col) =>
    col.reduce((a, b) => a + (b.kind === "cover" ? sz.cover : b.kind === "info" ? sz.info : b.kind === "photo" ? b.height : (b.cont ? sz.cont(b.name) : sz.head(b.name, b.curved)) + b.dishes.reduce((x, d) => x + sz.dish(d), 0)), 0),
  );
}

/** Lay the menu into 8 columns that are as even as possible: find the shortest column height that fits,
 *  then, among layouts up to 10% taller, keep the one whose lightest column is fullest. */
export function paginate(sections: [string, Dish[]][], sz: Sizes = ROW_SIZES): Block[][] {
  const total = sz.cover + sz.info + sections.reduce((a, [name, ds], i) => a + sz.head(name, i % 2 === 0) + ds.reduce((b, d) => b + sz.dish(d), 0), 0);
  const step = total / 800;
  let cap = Math.max(sz.cover, total / COLUMNS);
  while (cap < total && pack(sections, cap, sz).length > COLUMNS) cap += step;
  let best = pack(sections, cap, sz);
  let bestScore = -Infinity;
  for (let c = cap; c <= cap * 1.1; c += step) {
    const cols = pack(sections, c, sz);
    if (cols.length !== COLUMNS) continue;
    const h = heights(cols, sz);
    const score = Math.min(...h) / Math.max(...h); // 1 = perfectly even
    if (score > bestScore + 1e-9) {
      best = cols;
      bestScore = score;
    }
  }
  return best;
}
