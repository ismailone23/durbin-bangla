"use client";
import {
  BarChart3,
  CalendarCheck,
  LayoutGrid,
  LogOut,
  PackageCheck,
  Settings,
  Soup,
  Ticket,
  TvMinimal,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/site";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { api, useNow, usePoll, useServerOffset } from "@/lib/client";
import { dhakaClock } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TableRow = {
  id: number;
  label: string;
  seats: number;
  zone: string;
  status: "free" | "occupied" | "cleaning";
  party_kind: "booking" | "queue" | "walkin" | null;
  party_ref: string | null;
  party_name: string | null;
  party_size: number | null;
  since: number | null;
};
export type BookingRow = {
  code: string;
  day: string;
  slot: string;
  party: number;
  seats: number;
  name: string;
  phone: string;
  status:
    | "booked"
    | "arrived"
    | "seated"
    | "completed"
    | "no_show"
    | "cancelled";
  table_label: string | null;
  late: boolean;
};
export type TicketRow = {
  id: string;
  token: number;
  name: string;
  phone: string;
  party: number;
  status: "waiting" | "called" | "seated" | "done" | "skipped" | "left";
  table_label: string | null;
  created_at: number;
  called_at: number | null;
  seated_at: number | null;
};
export type OrderRow = {
  code: string;
  pickup: string;
  name: string;
  phone: string;
  status: "placed" | "preparing" | "ready" | "collected" | "cancelled";
  total: number;
  items: { name: string; qty: number }[];
};
export type MenuRow = {
  id: number;
  name: string;
  name_bn: string;
  category: string;
  price: number;
  daily_stock: number;
  remaining: number;
  active: number;
};
export type Settings = {
  openMin: number;
  lastSlotMin: number;
  closeMin: number;
  pickupEndMin: number;
  slotMin: number;
  avgStayMin: number;
  onlineShare: number;
  daysAhead: number;
  graceMin: number;
  maxParty: number;
  pickupWindowMin: number;
  pickupCap: number;
  bookingOpen: boolean;
  queueOpen: boolean;
  ordersOpen: boolean;
};
export type Overview = {
  now: number;
  day: string;
  settings: Settings;
  tables: TableRow[];
  bookings: BookingRow[];
  queue: TicketRow[];
  orders: OrderRow[];
  menu: MenuRow[];
  currentSlot: string;
  upcomingSlot: string | null;
  queueSummary: {
    open: boolean;
    waiting: number;
    eta: number;
    nowServing: number | null;
  };
};

type Ctx = {
  data: Overview | null;
  now: number;
  act: (a: Record<string, unknown>, ok?: string) => Promise<boolean>;
};
const StaffCtx = createContext<Ctx | null>(null);
export const useStaff = () => useContext(StaffCtx)!;

const NAV = [
  { href: "/staff", label: "Floor", icon: LayoutGrid },
  { href: "/staff/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/staff/queue", label: "Queue", icon: Ticket },
  { href: "/staff/pickups", label: "Pickups", icon: PackageCheck },
  { href: "/staff/menu", label: "Menu & stock", icon: Soup },
  { href: "/staff/insights", label: "Insights", icon: BarChart3 },
  { href: "/staff/settings", label: "Settings", icon: Settings },
];

export function StaffShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { data, error, refresh } = usePoll<Overview>(
    "/api/staff/overview",
    5000,
  );
  const now = useNow(1000, useServerOffset(data?.now));

  useEffect(() => {
    if (error?.includes("log in")) router.replace("/staff/login");
  }, [error, router]);

  const act = useCallback(
    async (a: Record<string, unknown>, ok?: string) => {
      try {
        await api("/api/staff/action", a);
        if (ok) toast.success(ok);
        await refresh();
        return true;
      } catch (e) {
        toast.error((e as Error).message);
        return false;
      }
    },
    [refresh],
  );

  const counts: Record<string, number> = {
    "/staff/queue": data?.queueSummary.waiting ?? 0,
    "/staff/pickups":
      data?.orders.filter((o) => o.status === "placed").length ?? 0,
  };

  return (
    <StaffCtx.Provider value={{ data, now, act }}>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="p-4">
            <Logo sub="Staff" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map((n) => (
                    <SidebarMenuItem key={n.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          n.href === "/staff"
                            ? path === "/staff"
                            : path.startsWith(n.href)
                        }
                      >
                        <Link href={n.href}>
                          <n.icon />
                          <span>{n.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {counts[n.href] > 0 && (
                        <SidebarMenuBadge>{counts[n.href]}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/board" target="_blank">
                    <TvMinimal />
                    <span>Open gate display</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={async () => {
                    await api("/api/staff/login", undefined, "DELETE");
                    router.replace("/staff/login");
                  }}
                >
                  <LogOut />
                  <span>Log out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 items-center gap-3 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm text-muted-foreground">Dhaka time</span>
            <span className="text-sm font-medium tabular-nums">
              {dhakaClock(now)}
            </span>
          </header>
          <div className="flex flex-col gap-6 p-4 sm:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </StaffCtx.Provider>
  );
}

export function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/** A label, a big number and a note. `alert` colours the number when it needs attention. */
export function Stat({
  label,
  value,
  note,
  alert,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  alert?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn("text-2xl tabular-nums", alert && "text-primary")}
        >
          {value}
        </CardTitle>
        {note && <CardDescription>{note}</CardDescription>}
      </CardHeader>
    </Card>
  );
}
