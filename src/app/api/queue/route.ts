import { z } from "zod";
import { body, handle, nameSchema, phoneSchema } from "@/lib/http";
import { joinQueue, queueSummary } from "@/lib/queue";

export const GET = handle(() => queueSummary());

const schema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  party: z.number().int(),
});
export const POST = handle(async (req) => joinQueue(await body(req, schema)));
