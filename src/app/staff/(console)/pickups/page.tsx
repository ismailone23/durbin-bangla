"use client";
import { PageTitle, Stat, type OrderRow, useStaff } from "@/components/staff/StaffShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtTime, taka } from "@/lib/format";

const TABS: { key: OrderRow["status"]; label: string; next?: OrderRow["status"]; nextLabel?: string; back?: OrderRow["status"] }[] = [
  { key: "placed", label: "New", next: "preparing", nextLabel: "Start" },
  { key: "preparing", label: "Preparing", next: "ready", nextLabel: "Mark ready" },
  { key: "ready", label: "Ready", next: "collected", nextLabel: "Collected", back: "preparing" },
  { key: "collected", label: "Collected", back: "ready" },
];
const toMin = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3);

export default function PickupsPage() {
  const { data, now, act } = useStaff();
  if (!data) return <Skeleton className="h-[70vh]" />;

  const nowMin = Math.floor(((now + 6 * 3600e3) % 864e5) / 60e3);
  const orders = data.orders.filter((o) => o.status !== "cancelled");
  const due = orders.filter((o) => (o.status === "placed" || o.status === "preparing") && toMin(o.pickup) <= nowMin + 15);

  return (
    <>
      <PageTitle title="Takeaway pickups" description="Ready order codes show on the gate display" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Orders today" value={orders.length} />
        <Stat label="Due in 15 min, not ready" value={due.length} alert={due.length > 0} />
        <Stat label="Waiting at counter" value={orders.filter((o) => o.status === "ready").length} />
        <Stat label="Pre-order sales" value={taka(orders.reduce((a, o) => a + o.total, 0))} />
      </div>

      <Tabs defaultValue="placed">
        <TabsList>
          {TABS.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label} ({orders.filter((o) => o.status === t.key).length})</TabsTrigger>)}
        </TabsList>
        {TABS.map((t) => {
          const list = orders.filter((o) => o.status === t.key);
          return (
            <TabsContent key={t.key} value={t.key}>
              <Card className="py-0">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Pickup</TableHead><TableHead>Code</TableHead><TableHead>Guest</TableHead><TableHead>Items</TableHead><TableHead>Total</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((o) => (
                      <TableRow key={o.code}>
                        <TableCell className={t.next && t.key !== "ready" && toMin(o.pickup) <= nowMin ? "font-medium text-primary" : undefined}>{fmtTime(o.pickup)}</TableCell>
                        <TableCell className="font-mono">{o.code}</TableCell>
                        <TableCell>{o.name}</TableCell>
                        <TableCell className="whitespace-normal">{o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}</TableCell>
                        <TableCell className="tabular-nums">{taka(o.total)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {t.next && <Button size="sm" onClick={() => act({ type: "order", code: o.code, status: t.next })}>{t.nextLabel}</Button>}
                            {t.back && <Button size="sm" variant="ghost" onClick={() => act({ type: "order", code: o.code, status: t.back })}>Undo</Button>}
                            {(t.key === "placed" || t.key === "preparing") && (
                              <Button size="sm" variant="ghost" onClick={() => confirm(`Cancel order ${o.code}? Its portions go back on the menu.`) && act({ type: "order", code: o.code, status: "cancelled" }, `${o.code} cancelled`)}>Cancel</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {list.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No orders here</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </>
  );
}
