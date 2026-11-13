import { cookies } from "next/headers";
import { z } from "zod";
import { COOKIE, login } from "@/lib/auth";
import { body, handle } from "@/lib/http";

export const POST = handle(async (req) => {
  const { pin } = await body(
    req,
    z.object({ pin: z.string().min(1, "Enter the PIN").max(64) }),
  );
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const token = login(pin, ip);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 14 * 3600,
  });
});

export const DELETE = handle(async () => {
  (await cookies()).delete(COOKIE);
});
