import { requireStaff } from "@/lib/auth";
import { handle } from "@/lib/http";
import { insights } from "@/lib/insights";

export const GET = handle(async (req) => {
  await requireStaff();
  const days =
    Number(new URL(req.url).searchParams.get("days")) === 30 ? 30 : 7;
  return insights(days);
});
