import type { Metadata } from "next";
import { PageShell } from "@/components/site";
import { OrderMenu } from "./OrderMenu";

export const metadata: Metadata = { title: "Takeaway pre-order" };

export default function OrderPage() {
  return (
    <PageShell
      title="Order for pickup"
      description="Order now, pick a 15-minute pickup window, and pay at the counter when you collect."
      photo="/photos/thali.jpg"
      alt="A brass tray of curries at Durbin Bangla"
    >
      <OrderMenu />
    </PageShell>
  );
}
