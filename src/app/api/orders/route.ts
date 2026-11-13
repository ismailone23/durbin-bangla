import { z } from "zod";
import { body, handle, nameSchema, phoneSchema, timeSchema } from "@/lib/http";
import { placeOrder, publicOrder } from "@/lib/orders";

const schema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  pickup: timeSchema,
  items: z
    .array(
      z.object({ id: z.number().int(), qty: z.number().int().min(1).max(20) }),
    )
    .min(1, "Your bag is empty")
    .max(20),
});

export const POST = handle(async (req) =>
  publicOrder(placeOrder(await body(req, schema)).code),
);
