import {
  DatabaseSync,
  type SQLInputValue,
  type StatementSync,
} from "node:sqlite";
import path from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS tables (
  id INTEGER PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  seats INTEGER NOT NULL,
  zone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'free',          -- free | occupied | cleaning
  party_kind TEXT, party_ref TEXT, party_name TEXT, party_size INTEGER, since INTEGER
);

CREATE TABLE IF NOT EXISTS bookings (
  code TEXT PRIMARY KEY,
  day TEXT NOT NULL, slot TEXT NOT NULL,
  party INTEGER NOT NULL, seats INTEGER NOT NULL,
  name TEXT NOT NULL, phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked',        -- booked | arrived | seated | completed | no_show | cancelled
  table_id INTEGER,
  created_at INTEGER NOT NULL, arrived_at INTEGER, seated_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_per_phone ON bookings(day, phone) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS bookings_by_slot ON bookings(day, slot);

CREATE TABLE IF NOT EXISTS queue (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL, token INTEGER NOT NULL,
  name TEXT NOT NULL, phone TEXT NOT NULL, party INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',       -- waiting | called | seated | done | skipped | left
  table_id INTEGER,
  created_at INTEGER NOT NULL, called_at INTEGER, seated_at INTEGER,
  UNIQUE(day, token)
);
CREATE UNIQUE INDEX IF NOT EXISTS queue_one_active_per_phone ON queue(day, phone) WHERE status IN ('waiting', 'called');

CREATE TABLE IF NOT EXISTS menu (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL, name_bn TEXT NOT NULL, description TEXT NOT NULL,
  category TEXT NOT NULL, price INTEGER NOT NULL,
  daily_stock INTEGER NOT NULL, remaining INTEGER NOT NULL, stock_day TEXT NOT NULL DEFAULT '',
  takeaway INTEGER NOT NULL DEFAULT 1, active INTEGER NOT NULL DEFAULT 1, signature INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  code TEXT PRIMARY KEY,
  day TEXT NOT NULL, pickup TEXT NOT NULL,
  name TEXT NOT NULL, phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'placed',        -- placed | preparing | ready | collected | cancelled
  total INTEGER NOT NULL,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_by_day ON orders(day, pickup);

CREATE TABLE IF NOT EXISTS order_items (
  order_code TEXT NOT NULL REFERENCES orders(code),
  item_id INTEGER NOT NULL REFERENCES menu(id),
  qty INTEGER NOT NULL, price INTEGER NOT NULL
);
`;

// Sample floor: 36 tables, 136 seats. Edit from the staff Settings page later if needed.
const FLOOR: [zone: string, seats: number, count: number][] = [
  ["Window", 2, 8],
  ["Main hall", 4, 24],
  ["Family", 6, 4],
];

// Sample menu and prices: replace with the restaurant's real menu.
// The restaurant's printed menu (2026), in its own sections and order. `true` = house favourite
// (the dishes the press and reviews name most). Prices in taka, before 5% VAT. Daily stock is a
// starting guess for the app's sell-out counter; staff set the real figure on Menu & stock.
const MENU: [string, string, string, string, number, number, boolean][] = [
  ["Patla Naan", "", "", "Shokaler Sohor", 25, 1000, false],
  ["Paratha", "", "", "Shokaler Sohor", 20, 1000, false],
  ["Rumali Ruti", "", "", "Shokaler Sohor", 30, 1000, true],
  ["Shobji Gulisthan", "", "", "Shokaler Sohor", 40, 200, false],
  ["Bhaaji", "", "", "Shokaler Sohor", 30, 200, false],
  ["Shokal Bela'r Daal", "", "", "Shokaler Sohor", 30, 200, false],
  ["Daal Bhaji Mixed", "", "", "Shokaler Sohor", 40, 200, false],
  ["Jholer Raza Aalu", "", "", "Shokaler Sohor", 40, 200, false],
  ["Norom Gorom Maghaz (half)", "", "", "Shokaler Sohor", 120, 200, false],
  ["Norom Gorom Maghaz (full)", "", "", "Shokaler Sohor", 240, 200, false],
  ["Makkhon Chicken Soup", "", "", "Shokaler Sohor", 150, 200, true],
  ["Ghee Malai Shuji", "", "", "Shokaler Sohor", 50, 200, true],
  ["Khasi'r Paya", "", "", "Shokaler Sohor", 140, 200, false],
  ["Special Khasi'r Paya", "", "", "Shokaler Sohor", 220, 200, false],
  ["Khasir Kolija (half)", "", "", "Shokaler Sohor", 120, 200, false],
  ["Khasir Kolija (full)", "", "", "Shokaler Sohor", 240, 200, false],
  ["Murgh Polao", "", "", "Bhor Dupure", 230, 200, false],
  ["Ghee Makha Gorur Bhuna Khichuri", "", "", "Bhor Dupure", 260, 200, false],
  ["Plain Polao", "", "", "Bhor Dupure", 80, 200, false],
  ["Chicken Roast", "", "", "Bhor Dupure", 150, 200, false],
  ["Mutton Leg Roast", "", "", "Bhor Dupure", 390, 200, false],
  ["Korola'r Kanna", "", "", "Bharta o Bhaji'r Bhalobasha", 60, 200, false],
  ["Maayer Haate Aalur Bhorta", "", "", "Bharta o Bhaji'r Bhalobasha", 30, 200, false],
  ["Shaak Bhazi", "", "", "Bharta o Bhaji'r Bhalobasha", 60, 200, false],
  ["Na Khaile Miss Chingri", "", "", "Bharta o Bhaji'r Bhalobasha", 100, 200, false],
  ["Roshuner Bhorta", "", "", "Bharta o Bhaji'r Bhalobasha", 50, 200, false],
  ["Daal", "", "", "Bharta o Bhaji'r Bhalobasha", 30, 200, false],
  ["Roshuner Buke Jhaal Murgi", "", "", "Curry'r Golpo", 170, 200, false],
  ["Tultule Laal Jhal Beef", "", "", "Curry'r Golpo", 250, 200, false],
  ["Gorur Kala Bhuna", "", "", "Curry'r Golpo", 250, 200, false],
  ["Daal Khasi", "", "", "Curry'r Golpo", 230, 200, false],
  ["Shada Bhaat", "", "", "Mache bhate Bangali", 40, 1000, false],
  ["Dui Moriche Mach Bhaja", "", "", "Mache bhate Bangali", 250, 200, false],
  ["Loitta'r Lava Fry", "", "", "Mache bhate Bangali", 180, 200, false],
  ["Tok Jhal Rui'r Jhol", "", "", "Mache bhate Bangali", 250, 200, false],
  ["Tengra Macher Jhol", "", "", "Mache bhate Bangali", 160, 200, false],
  ["Paka Paka Peyaj e Chingri", "", "", "Mache bhate Bangali", 380, 200, false],
  ["Rupchada'r Rong (Fry/Curry)", "", "", "Mache bhate Bangali", 400, 200, false],
  ["Shorshe Dhowa Illish Bhaja", "", "", "Mache bhate Bangali", 500, 200, false],
  ["Patar Bhetore Illish (Paturi)", "", "", "Mache bhate Bangali", 600, 200, false],
  ["Shorshe Bhetki (Paturi)", "", "", "Mache bhate Bangali", 320, 200, false],
  ["Beef Sheek", "", "", "Cheka Pora", 260, 200, false],
  ["Makkhon Beef Sheek", "", "", "Cheka Pora", 380, 200, false],
  ["Chicken Boti", "", "", "Cheka Pora", 200, 200, false],
  ["Chicken Tandoori", "", "", "Cheka Pora", 250, 200, false],
  ["Chicken Tikka", "", "", "Cheka Pora", 250, 200, false],
  ["Chicken Reshmi", "", "", "Cheka Pora", 260, 200, false],
  ["Chicken Hariyali", "", "", "Cheka Pora", 260, 200, false],
  ["Laal Badshah", "", "", "Cheka Pora", 200, 200, false],
  ["Chicken Chaap", "", "", "Cheka Pora", 180, 1000, false],
  ["Plain Naan", "", "", "Cheka Pora", 40, 1000, false],
  ["Butter Naan", "", "", "Cheka Pora", 60, 1000, false],
  ["Garlic Naan", "", "", "Cheka Pora", 70, 1000, false],
  ["Pech Paratha", "", "", "Cheka Pora", 35, 1000, false],
  ["Rumali Roti", "", "", "Cheka Pora", 30, 1000, false],
  ["Chanar Rosh Golla", "", "", "Mukh Mitha", 30, 1000, true],
  ["Nimki", "", "", "Mukh Mitha", 15, 1000, false],
  ["Durbin Bangla Special Chaa", "", "", "Mukh Mitha", 40, 1000, false],
];

type Db = { db: DatabaseSync; cache: Map<string, StatementSync> };
const g = globalThis as unknown as { __durbinDb?: Db };

function open(): Db {
  const db = new DatabaseSync(
    process.env.DB_FILE ?? path.join(process.cwd(), "data.db"),
  );
  // busy_timeout first: switching to WAL needs a lock, and another process may be holding it.
  db.exec(
    "PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;",
  );
  db.exec(SCHEMA);
  // First-run fill under a write lock: several processes (e.g. parallel build workers) can open a new
  // file at once, and without the lock each sees an empty table and inserts its own copy.
  db.exec("BEGIN IMMEDIATE");
  try {
    seedEmpty(db);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return { db, cache: new Map() };
}

function seedEmpty(db: DatabaseSync) {
  if (!db.prepare("SELECT 1 FROM tables LIMIT 1").get()) {
    const insert = db.prepare(
      "INSERT INTO tables (label, seats, zone) VALUES (?, ?, ?)",
    );
    let n = 1;
    for (const [zone, seats, count] of FLOOR)
      for (let i = 0; i < count; i++) insert.run(`T${n++}`, seats, zone);
  }
  if (!db.prepare("SELECT 1 FROM menu LIMIT 1").get()) {
    const insert = db.prepare(
      "INSERT INTO menu (name, name_bn, description, category, price, daily_stock, remaining, signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    for (const [name, bn, desc, cat, price, stock, sig] of MENU)
      insert.run(name, bn, desc, cat, price, stock, stock, sig ? 1 : 0);
  }
}

const conn = (g.__durbinDb ??= open());

function st(sql: string) {
  let s = conn.cache.get(sql);
  if (!s) conn.cache.set(sql, (s = conn.db.prepare(sql)));
  return s;
}

export const q = {
  all: <T>(sql: string, ...p: SQLInputValue[]) => st(sql).all(...p) as T[],
  get: <T>(sql: string, ...p: SQLInputValue[]) =>
    st(sql).get(...p) as T | undefined,
  run: (sql: string, ...p: SQLInputValue[]) => st(sql).run(...p),
  exec: (sql: string) => conn.db.exec(sql),
};

let depth = 0;
/** Runs fn in one write transaction. Nested calls join the outer one. */
export function tx<T>(fn: () => T): T {
  if (depth > 0) return fn();
  conn.db.exec("BEGIN IMMEDIATE");
  depth++;
  try {
    const r = fn();
    conn.db.exec("COMMIT");
    return r;
  } catch (e) {
    conn.db.exec("ROLLBACK");
    throw e;
  } finally {
    depth--;
  }
}
