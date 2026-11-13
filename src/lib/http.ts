import { randomInt } from "node:crypto";
import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const fail = (status: number, message: string): never => {
  throw new HttpError(status, message);
};

/** Wraps a route handler: JSON out, HttpError/ZodError mapped to clean 4xx, everything else logged as 500. */
export function handle<C>(fn: (req: Request, ctx: C) => unknown) {
  return async (req: Request, ctx: C) => {
    try {
      return Response.json((await fn(req, ctx)) ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError)
        return Response.json({ error: e.message }, { status: e.status });
      if (e instanceof z.ZodError)
        return Response.json(
          { error: e.issues[0]?.message ?? "Invalid input" },
          { status: 400 },
        );
      if (e instanceof Error && e.message === "Opening hours are out of order")
        return Response.json({ error: e.message }, { status: 400 });
      console.error(e);
      return Response.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }
  };
}

export async function body<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<z.infer<S>> {
  if (Number(req.headers.get("content-length") ?? 0) > 20_000)
    fail(413, "Request too large");
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    fail(400, "Invalid request");
  }
  return schema.parse(raw);
}

export const phoneSchema = z
  .string()
  .transform((s) => s.replace(/[\s-]/g, "").replace(/^\+?88/, ""))
  .pipe(
    z
      .string()
      .regex(
        /^01[3-9]\d{8}$/,
        "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)",
      ),
  );
export const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter your name")
  .max(60, "Name is too long");
export const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a day");
export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Pick a time");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I lookalikes
export const makeCode = (len = 6) =>
  Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join(
    "",
  );

/** SQLite unique-index violations, so callers can turn them into friendly 409s. */
export const isUnique = (e: unknown, index: string) =>
  e instanceof Error &&
  e.message.includes("UNIQUE") &&
  e.message.includes(index);
