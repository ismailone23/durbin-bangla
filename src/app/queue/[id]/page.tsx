import type { Metadata } from "next";
import { PageShell } from "@/components/site";
import { LiveTicket } from "./LiveTicket";

export const metadata: Metadata = { title: "Your token" };

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageShell title="Your place in the queue">
      <LiveTicket id={id} />
    </PageShell>
  );
}
