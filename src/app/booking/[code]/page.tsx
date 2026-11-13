import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site";
import { BookingTicket } from "./BookingTicket";

export const metadata: Metadata = { title: "Your booking" };

export default async function BookingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <PageShell title="Your booking">
      <Suspense>
        <BookingTicket code={code.toUpperCase()} />
      </Suspense>
    </PageShell>
  );
}
