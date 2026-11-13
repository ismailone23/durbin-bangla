import { fail, handle } from "@/lib/http";
import { publicOrder } from "@/lib/orders";

export const GET = handle(
  async (_req, { params }: { params: Promise<{ code: string }> }) =>
    publicOrder((await params).code) ?? fail(404, "Order not found"),
);
