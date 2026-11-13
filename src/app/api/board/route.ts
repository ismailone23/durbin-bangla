import { handle } from "@/lib/http";
import { boardData } from "@/lib/snapshot";

export const GET = handle(() => boardData());
