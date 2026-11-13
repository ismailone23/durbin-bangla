import { handle } from "@/lib/http";
import { publicStatus } from "@/lib/snapshot";

export const GET = handle(() => publicStatus());
