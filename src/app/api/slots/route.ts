import { availability, bookableDays } from "@/lib/bookings";
import { handle } from "@/lib/http";
import { getSettings } from "@/lib/settings";

export const GET = handle((req) => {
  const s = getSettings();
  const days = bookableDays(s);
  const asked = new URL(req.url).searchParams.get("day");
  const day = asked && days.includes(asked) ? asked : days[0];
  return {
    days,
    day,
    maxParty: s.maxParty,
    bookingOpen: s.bookingOpen,
    graceMin: s.graceMin,
    slots: availability(day),
  };
});
