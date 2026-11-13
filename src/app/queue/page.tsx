import type { Metadata } from "next";
import { PageShell } from "@/components/site";
import { JoinQueue } from "./JoinQueue";

export const metadata: Metadata = { title: "Walk-in queue" };

export default function QueuePage() {
  return (
    <PageShell
      title="Walk-in queue"
      description="Take a token, wait wherever you like, and come to the gate when your number is called."
      photo="/photos/busy-room.jpg"
      alt="A full dining room at Durbin Bangla"
    >
      <JoinQueue />
    </PageShell>
  );
}
