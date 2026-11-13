import type { Metadata } from "next";
import { PageShell } from "@/components/site";
import { BookingFlow } from "./BookingFlow";

export const metadata: Metadata = { title: "Book a table" };

export default function BookPage() {
  return (
    <PageShell
      title="Book a table"
      description="Online booking covers the morning rush, 7 am to noon, today or up to three days ahead. No booking? Join the queue at the gate."
      photo="/photos/interior.jpg"
      alt="The Durbin Bangla dining room"
    >
      <BookingFlow />

      <section id="queue" aria-labelledby="queue-h" className="mt-24 scroll-mt-28 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 id="queue-h" className="display text-(length:--step-head)">
            Walking in?
          </h2>
          <p className="mt-6 max-w-[40ch]">
            Walk-ins don&apos;t need to stand in line. Take a token on your
            phone and wait wherever you like nearby.
          </p>
        </div>
        <ol className="flex list-decimal flex-col gap-6 pl-6 text-(length:--step-lead) leading-snug marker:font-semibold marker:text-primary lg:col-span-6 lg:col-start-7">
          <li>Scan the QR code on the screen at the gate.</li>
          <li>Enter your name, phone number and how many people. You get a token number.</li>
          <li>Wait anywhere nearby. Your place in line and the wait time update live on your phone.</li>
          <li>When your token is called, your phone buzzes and your number shows on the gate screen. Come in and we seat you.</li>
        </ol>
      </section>
    </PageShell>
  );
}
