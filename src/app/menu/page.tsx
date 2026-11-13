import type { Metadata } from "next";
import { MenuBook } from "@/components/menu-sheet";
import { PageShell, WallTrail } from "@/components/site";

export const metadata: Metadata = { title: "Menu" };

export default function MenuPage() {
  return (
    <PageShell
      title="A map of Bengal"
      description="The heart of Bangal, on your plate. Fifty-six dishes, from the first paratha of the morning to the grill at night."
      photo="/photos/busy-room.jpg"
      alt="A full dining room at Durbin Bangla, under the kettle lamps"
      full
    >
      <section aria-label="The menu" className="deep relative isolate overflow-hidden px-3 py-14 sm:px-8 sm:py-20">
        <WallTrail opacity={0.08} />
        <MenuBook />
      </section>
    </PageShell>
  );
}
