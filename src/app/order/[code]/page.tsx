import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site";
import { OrderStatus } from "./OrderStatus";

export const metadata: Metadata = { title: "Your order" };

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <PageShell title="Your takeaway order">
      <Suspense>
        <OrderStatus code={code.toUpperCase()} />
      </Suspense>
    </PageShell>
  );
}
