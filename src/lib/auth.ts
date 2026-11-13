import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { fail } from "./http";

const g = globalThis as unknown as {
  __secret?: string;
  __attempts?: Map<string, { n: number; until: number }>;
};
// shortcut: without SESSION_SECRET, staff sessions end when the server restarts. Set it in production.
const secret = () =>
  process.env.SESSION_SECRET ??
  (g.__secret ??= randomBytes(32).toString("hex"));

function staffPin() {
  if (process.env.STAFF_PIN) return process.env.STAFF_PIN;
  if (process.env.NODE_ENV === "production")
    throw new Error("STAFF_PIN must be set in production");
  return "1234";
}

const sign = (v: string) =>
  createHmac("sha256", secret()).update(v).digest("base64url");
const sha = (v: string) => createHash("sha256").update(v).digest();
const attempts = (g.__attempts ??= new Map());

export const COOKIE = "durbin_staff";

/** 5 wrong PINs per IP locks login for 5 minutes. */
export function login(pin: string, ip: string) {
  const a = attempts.get(ip);
  if (a && a.n >= 5 && a.until > Date.now())
    fail(429, "Too many attempts. Try again in a few minutes.");
  if (!timingSafeEqual(sha(pin), sha(staffPin()))) {
    attempts.set(ip, {
      n: (a && a.until > Date.now() ? a.n : 0) + 1,
      until: Date.now() + 5 * 60e3,
    });
    fail(401, "Wrong PIN");
  }
  attempts.delete(ip);
  const exp = String(Date.now() + 14 * 3600e3);
  return `${exp}.${sign(exp)}`;
}

export async function isStaff() {
  const v = (await cookies()).get(COOKIE)?.value;
  const [exp, sig] = v?.split(".") ?? [];
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return (
    sig.length === good.length &&
    timingSafeEqual(Buffer.from(sig), Buffer.from(good))
  );
}

export async function requireStaff() {
  if (!(await isStaff())) fail(401, "Please log in again");
}
