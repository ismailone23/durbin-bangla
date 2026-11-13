"use client";
import { PageTitle, useStaff } from "@/components/staff/StaffShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { taka } from "@/lib/format";

export default function MenuPage() {
  const { data, act } = useStaff();
  if (!data) return <Skeleton className="h-[70vh]" />;

  return (
    <>
      <PageTitle title="Menu & stock" description="Portions left today. Customers see this live and items at zero show as sold out. Stock resets every morning." />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Item</TableHead><TableHead>Price</TableHead><TableHead>Left today</TableHead><TableHead>Adjust</TableHead><TableHead>On menu</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {data.menu.map((m) => {
              const set = (remaining: number) => act({ type: "menu", id: m.id, remaining: Math.max(0, remaining) });
              return (
                <TableRow key={m.id} className={m.active ? undefined : "text-muted-foreground"}>
                  <TableCell><p className="font-medium">{m.name}</p><p className="font-bn text-xs text-muted-foreground" lang="bn">{[m.name_bn, m.category].filter(Boolean).join(" · ")}</p></TableCell>
                  <TableCell className="tabular-nums">{taka(m.price)}</TableCell>
                  <TableCell className="tabular-nums">
                    {m.remaining === 0 ? <Badge variant="destructive">Sold out</Badge> : <>{m.remaining} <span className="text-muted-foreground">/ {m.daily_stock}</span></>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {[-10, -1, 1, 10].map((d) => (
                        <Button key={d} size="sm" variant="outline" className="w-10 tabular-nums" onClick={() => set(m.remaining + d)} aria-label={`${d > 0 ? "Add" : "Remove"} ${Math.abs(d)} ${m.name}`}>{d > 0 ? `+${d}` : d}</Button>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => set(0)} disabled={m.remaining === 0}>Sold out</Button>
                      <Button size="sm" variant="ghost" onClick={() => set(m.daily_stock)}>Reset</Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch checked={!!m.active} onCheckedChange={(v) => act({ type: "menu", id: m.id, active: v }, v ? `${m.name} shown` : `${m.name} hidden`)} aria-label={`Show ${m.name} on the menu`} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
