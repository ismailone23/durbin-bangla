import { z } from "zod";
import { createBooking } from "@/lib/bookings";
import {
  body,
  daySchema,
  handle,
  nameSchema,
  phoneSchema,
  timeSchema,
} from "@/lib/http";

const schema = z.object({
  day: daySchema,
  slot: timeSchema,
  party: z.number().int(),
  name: nameSchema,
  phone: phoneSchema,
});

export const POST = handle(async (req) => {
  const { phone, ...b } = createBooking(await body(req, schema));
  void phone;
  return b;
});
