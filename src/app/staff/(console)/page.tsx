"use client";
import { BellRing } from "lucide-react";
import { useState } from "react";
import {
  PageTitle,
  Stat,
  type TableRow,
  useStaff,
} from "@/components/staff/StaffShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ago, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function FloorPage() {
  const { data, now, act } = useStaff();
  const [selected, setSelected] = useState<number | null>(null);
  const [walkin, setWalkin] = useState("2");
  if (!data) return <Skeleton className="h-[70vh]" />;

  const s = data.settings;
  const overdue = (t: TableRow) =>
    t.status === "occupied" &&
    !!t.since &&
    now - t.since > (s.avgStayMin + 10) * 60e3;
  const occupied = data.tables.filter((t) => t.status === "occupied");
  const waiting = data.queue.filter((q) => q.status === "waiting");
  const called = data.queue.filter((q) => q.status === "called");
  const arrived = data.bookings.filter((b) => b.status === "arrived");
  const zones = [...new Set(data.tables.map((t) => t.zone))];
  const table = data.tables.find((t) => t.id === selected) ?? null;

  const candidates =
    table?.status === "free"
      ? [
          ...arrived.map((b) => ({
            key: b.code,
            label: b.name,
            sub: `Booking ${b.code}, at the gate`,
            size: b.party,
            party: { kind: "booking", code: b.code },
          })),
          ...called.map((q) => ({
            key: q.id,
            label: `#${q.token} ${q.name}`,
            sub: `Called ${ago(q.called_at ?? now, now)} ago`,
            size: q.party,
            party: { kind: "queue", id: q.id },
          })),
          ...data.bookings
            .filter((b) => b.status === "booked" && b.slot === data.currentSlot)
            .map((b) => ({
              key: b.code,
              label: b.name,
              sub: `Booking ${fmtTime(b.slot)}${b.late ? ", late" : ""}`,
              size: b.party,
              party: { kind: "booking", code: b.code },
            })),
          ...waiting
            .slice(0, 6)
            .map((q) => ({
              key: q.id,
              label: `#${q.token} ${q.name}`,
              sub: `Waiting ${ago(q.created_at, now)}`,
              size: q.party,
              party: { kind: "queue", id: q.id },
            })),
        ].filter((c) => c.size <= table.seats)
      : [];

  return (
    <>
      <PageTitle
        title="Floor"
        description={`Current slot ${fmtTime(data.currentSlot)}${data.upcomingSlot ? `, next ${fmtTime(data.upcomingSlot)}` : ""}`}
      >
        <Button
          onClick={() => act({ type: "callNext" }, "Next token called")}
          disabled={!waiting.length}
        >
          <BellRing data-icon="inline-start" />
          Call next token
        </Button>
      </PageTitle>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Tables occupied"
          value={`${occupied.length} / ${data.tables.length}`}
          note={`${data.tables.filter((t) => t.status === "free").length} free, ${data.tables.filter((t) => t.status === "cleaning").length} cleaning`}
        />
        <Stat
          label="Walk-in queue"
          value={waiting.length}
          note={`~${data.queueSummary.eta} min wait, ${called.length} called`}
        />
        <Stat
          label="Arriving next slot"
          value={
            data.bookings.filter(
              (b) => b.slot === data.upcomingSlot && b.status === "booked",
            ).length
          }
          note={
            data.upcomingSlot
              ? `Bookings at ${fmtTime(data.upcomingSlot)}`
              : "No more slots"
          }
        />
        <Stat
          label="Over time"
          value={occupied.filter(overdue).length}
          note={`Seated over ${s.avgStayMin + 10} min`}
          alert={occupied.some(overdue)}
        />
      </div>

      {zones.map((zone) => {
        const tables = data.tables.filter((t) => t.zone === zone);
        return (
          <Card key={zone}>
            <CardHeader>
              <CardTitle>{zone}</CardTitle>
              <CardDescription>
                {tables.filter((t) => t.status === "free").length} free of{" "}
                {tables.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {tables.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={cn(
                    "flex h-20 flex-col justify-between rounded-lg border p-2 text-left text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    t.status === "free" && "bg-background hover:bg-muted",
                    t.status === "occupied" && "bg-secondary hover:bg-accent",
                    t.status === "cleaning" &&
                      "border-dashed bg-muted/50 text-muted-foreground",
                    overdue(t) && "border-primary ring-1 ring-primary",
                  )}
                >
                  <span className="flex justify-between font-medium">
                    <span className="text-sm">{t.label}</span>
                    <span className="text-muted-foreground">{t.seats}p</span>
                  </span>
                  {t.status === "occupied" && (
                    <span className="flex flex-col">
                      <span className="truncate">{t.party_name}</span>
                      <span
                        className={cn(
                          "tabular-nums text-muted-foreground",
                          overdue(t) && "font-medium text-primary",
                        )}
                      >
                        {Math.floor((now - (t.since ?? now)) / 60e3)} min
                      </span>
                    </span>
                  )}
                  {t.status === "cleaning" && <span>Cleaning</span>}
                  {t.status === "free" && (
                    <span className="text-muted-foreground">Free</span>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <Sheet open={!!table} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent>
          {table && (
            <>
              <SheetHeader>
                <SheetTitle>Table {table.label}</SheetTitle>
                <SheetDescription>
                  {table.seats} seats, {table.zone}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4">
                {table.status === "occupied" && (
                  <>
                    <div className="text-sm">
                      <p className="font-medium">{table.party_name}</p>
                      <p className="text-muted-foreground">
                        {table.party_size} guests, seated{" "}
                        {ago(table.since!, now)} ago
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        act(
                          { type: "clear", tableId: table.id },
                          `${table.label} sent to cleaning`,
                        )
                      }
                    >
                      Guests left, clear table
                    </Button>
                  </>
                )}
                {table.status === "cleaning" && (
                  <Button
                    onClick={() =>
                      act(
                        { type: "ready", tableId: table.id },
                        `${table.label} is ready`,
                      )
                    }
                  >
                    Table is clean
                  </Button>
                )}
                {table.status === "free" && (
                  <>
                    <p className="text-sm font-medium">Seat someone waiting</p>
                    {candidates.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Nobody waiting fits this table
                      </p>
                    )}
                    <div className="flex flex-col gap-2">
                      {candidates.map((c) => (
                        <Button
                          key={c.key}
                          variant="outline"
                          className="h-auto justify-between py-2"
                          onClick={async () => {
                            if (
                              await act(
                                {
                                  type: "seat",
                                  tableId: table.id,
                                  party: c.party,
                                },
                                `${c.label} seated at ${table.label}`,
                              )
                            )
                              setSelected(null);
                          }}
                        >
                          <span className="flex flex-col items-start">
                            <span>{c.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {c.sub}
                            </span>
                          </span>
                          <Badge variant="secondary">{c.size}</Badge>
                        </Button>
                      ))}
                    </div>
                    <Separator />
                    <Field>
                      <FieldLabel>Quick walk-in, no token</FieldLabel>
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        value={walkin}
                        onValueChange={(v) => v && setWalkin(v)}
                      >
                        {Array.from({ length: table.seats }, (_, i) =>
                          String(i + 1),
                        ).map((n) => (
                          <ToggleGroupItem key={n} value={n} className="w-9">
                            {n}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </Field>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        if (
                          await act(
                            {
                              type: "seat",
                              tableId: table.id,
                              party: {
                                kind: "walkin",
                                party: Math.min(+walkin, table.seats),
                              },
                            },
                            `Walk-in seated at ${table.label}`,
                          )
                        )
                          setSelected(null);
                      }}
                    >
                      Seat walk-in
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
