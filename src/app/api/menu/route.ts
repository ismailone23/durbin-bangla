import { handle } from "@/lib/http";
import { listMenu, pickupWindows } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

export const GET = handle(() => ({
  ordersOpen: getSettings().ordersOpen,
  menu: listMenu()
    .filter((m) => m.active)
    .map(({ daily_stock, active, ...m }) => (void daily_stock, void active, m)),
  windows: pickupWindows(),
}));
