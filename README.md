# Durbin Bangla: Breakfast without the crowd

A web app that spreads Durbin Bangla's morning rush across the whole breakfast service. It has three ways in, so nobody has to wait in the lane:

| Guests | What it does |
|---|---|
| **Book a table** `/book` | 45-minute breakfast slots up to 3 days ahead. 70% of tables can be booked online; the rest stay for walk-ins. The ticket has a QR code, a countdown, a calendar file, and change/cancel. |
| **Walk-in queue** `/queue` | Scan the QR at the gate to get a token on your phone. Your place and estimated wait update live, and the phone vibrates when you're called. |
| **Takeaway pre-order** `/order` | Order paya, suji and the rest for a 15-minute pickup window. Stock counts live and sells out automatically. You pay at pickup. |
| **Gate display** `/board` | For the TV at the gate: tokens being called, who's next, takeaway orders ready, a QR to join the queue, and dishes still in stock. |

| Staff (`/staff`, PIN login) | |
|---|---|
| **Floor** | All 36 tables live. Tap a table to seat a booking, a token or a quick walk-in; clear it; mark it clean. Tables that run over time are highlighted. |
| **Bookings / Queue / Pickups** | Check guests in, mark no-shows, call the next token, move takeaway orders through the kitchen. |
| **Menu & stock** | Portions left today; customers see sold-out items immediately. |
| **Insights** | Guests served, show-up rate, walk-in wait, the hourly arrival curve, top takeaway items. |
| **Settings** | Hours, slot length, share of tables bookable online, and switches to pause booking, the queue or pre-orders. |

## Run it

```bash
pnpm install
pnpm demo        # fills 2 weeks of sample data and starts the app as if it's 8:20 am
```

Open http://localhost:3000. The staff PIN is `1234` in development.

- `pnpm dev`: run without the demo clock (real Dhaka time).
- `pnpm seed`: refill the sample data (use the same `DEMO_CLOCK` as the server).
- `pnpm test`: business-rule tests (no overbooking, stock, seating, queue order).

### Environment

| Variable | |
|---|---|
| `STAFF_PIN` | **Required in production.** Staff console PIN. |
| `SESSION_SECRET` | Signs staff sessions. Without it, staff are logged out when the server restarts. |
| `DB_FILE` | SQLite file path (default `./data.db`). |
| `DEMO_CLOCK` | `HH:MM`: run as if it's that time today. For demos only. |

## How it's built

Next.js 16 (App Router) + React 19, Tailwind 4 and shadcn/ui (Radix), themed with the restaurant's own colours: burnt-orange wall, plaster cream, mahogany. Charts use shadcn Chart (Recharts). Data is SQLite through Node's built-in `node:sqlite` (Node 24+).

- `src/lib/`: all the business rules (`bookings`, `queue`, `floor`, `orders`, `insights`). Every write goes through a transaction, so two people can't take the last table or the last bowl of paya.
- `src/app/api/`: JSON routes. Input is checked with zod. Staff routes need the signed session cookie, and PIN attempts are rate-limited.
- Pages poll every 4–15 seconds. That's plenty for a queue and avoids a websocket server.

## Not built yet (deliberately)

- **SMS and bKash.** The design leaves room for them: an SMS when a token is called or a booking is due, and a small bKash deposit to cut no-shows. Without SMS verification, anyone can book with any phone number.
- Scanning QR codes with the staff phone camera (staff type the code or search by name or phone for now).
- Several branches, staff accounts with roles, and joining tables for big groups.
- Prices, menu and floor plan are **sample data**. Replace them with the restaurant's real ones (`src/lib/db.ts`).
