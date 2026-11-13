import { z } from "zod";
import { cancelBooking, getBooking, rescheduleBooking } from "@/lib/bookings";
import {
  body,
  daySchema,
  fail,
  handle,
  phoneSchema,
  timeSchema,
} from "@/lib/http";
import { getSettings } from "@/lib/settings";
import { at, clock } from "@/lib/time";

type Ctx = { params: Promise<{ code: string }> };

const view = (code: string) => {
  const b = getBooking(code) ?? fail(404, "Booking not found");
  const { phone, ...pub } = b;
  return {
    ...pub,
    phoneHint: `•••••••${phone.slice(-4)}`,
    graceMin: getSettings().graceMin,
    startsAt: at(b.day, b.slot),
    now: clock(),
  };
};

export const GET = handle(async (_req, { params }: Ctx) =>
  view((await params).code),
);

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), phone: phoneSchema }),
  z.object({
    action: z.literal("reschedule"),
    phone: phoneSchema,
    day: daySchema,
    slot: timeSchema,
    party: z.number().int(),
  }),
]);

export const POST = handle(async (req, { params }: Ctx) => {
  const { code } = await params;
  const input = await body(req, schema);
  if (input.action === "cancel") cancelBooking(code, input.phone);
  else rescheduleBooking(code, input.phone, input.day, input.slot, input.party);
  return view(code);
});
