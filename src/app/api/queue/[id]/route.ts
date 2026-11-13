import { fail, handle } from "@/lib/http";
import { leaveQueue, ticket } from "@/lib/queue";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(
  async (_req, { params }: Ctx) =>
    ticket((await params).id) ?? fail(404, "Ticket not found"),
);
export const POST = handle(async (_req, { params }: Ctx) => {
  const { id } = await params;
  leaveQueue(id);
  return ticket(id);
});
