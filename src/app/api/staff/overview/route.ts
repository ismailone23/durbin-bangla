import { requireStaff } from "@/lib/auth";
import { handle } from "@/lib/http";
import { staffOverview } from "@/lib/snapshot";

export const GET = handle(async () => {
  await requireStaff();
  return staffOverview();
});
