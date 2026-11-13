import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { setBookingStatus } from "@/lib/bookings";
import { clearTable, seat, tableReady } from "@/lib/floor";
import { body, handle } from "@/lib/http";
import { setOrderStatus, updateMenuItem } from "@/lib/orders";
import { callNext, setTicketStatus } from "@/lib/queue";
import { saveSettings, settingsSchema } from "@/lib/settings";

const id = z.number().int().positive();
const schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("seat"),
    tableId: id,
    party: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("booking"), code: z.string().max(12) }),
      z.object({ kind: z.literal("queue"), id: z.string().max(32) }),
      z.object({
        kind: z.literal("walkin"),
        party: z.number().int().min(1).max(12),
      }),
    ]),
  }),
  z.object({ type: z.literal("clear"), tableId: id }),
  z.object({ type: z.literal("ready"), tableId: id }),
  z.object({
    type: z.literal("booking"),
    code: z.string().max(12),
    status: z.enum(["booked", "arrived", "no_show", "cancelled"]),
  }),
  z.object({
    type: z.literal("ticket"),
    id: z.string().max(32),
    status: z.enum(["waiting", "called", "skipped", "left"]),
  }),
  z.object({ type: z.literal("callNext") }),
  z.object({
    type: z.literal("order"),
    code: z.string().max(12),
    status: z.enum(["placed", "preparing", "ready", "collected", "cancelled"]),
  }),
  z.object({
    type: z.literal("menu"),
    id,
    remaining: z.number().int().min(0).max(100000).optional(),
    dailyStock: z.number().int().min(0).max(100000).optional(),
    price: z.number().int().min(0).max(100000).optional(),
    active: z.boolean().optional(),
  }),
  z.object({ type: z.literal("settings"), patch: settingsSchema.partial() }),
]);

export const POST = handle(async (req) => {
  await requireStaff();
  const a = await body(req, schema);
  switch (a.type) {
    case "seat":
      return seat(a.tableId, a.party);
    case "clear":
      return clearTable(a.tableId);
    case "ready":
      return tableReady(a.tableId);
    case "booking":
      return setBookingStatus(a.code, a.status);
    case "ticket":
      return setTicketStatus(a.id, a.status);
    case "callNext":
      return callNext();
    case "order":
      return setOrderStatus(a.code, a.status);
    case "menu":
      return updateMenuItem(a.id, a);
    case "settings":
      return saveSettings(a.patch);
  }
});
