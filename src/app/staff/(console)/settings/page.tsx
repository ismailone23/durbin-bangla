"use client";
import { useEffect, useState } from "react";
import { PageTitle, type Settings, useStaff } from "@/components/staff/StaffShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fromTime = (s: string) => +s.slice(0, 2) * 60 + +s.slice(3, 5);

const SWITCHES = [
  { key: "bookingOpen", label: "Online booking", note: "Pause if the restaurant is full for a private event" },
  { key: "queueOpen", label: "Walk-in queue", note: "Open from an hour before breakfast until 30 minutes before it ends" },
  { key: "ordersOpen", label: "Takeaway pre-orders", note: "Pause when the kitchen is overloaded" },
] as const;

export default function SettingsPage() {
  const { data, act } = useStaff();
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => {
    if (data && !s) setS(data.settings);
  }, [data, s]);
  if (!data || !s) return <Skeleton className="h-[70vh]" />;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });
  const bySize = new Map<number, number>();
  for (const t of data.tables) bySize.set(t.seats, (bySize.get(t.seats) ?? 0) + 1);
  const online = [...bySize.values()].reduce((a, n) => a + Math.floor(n * s.onlineShare), 0); // same rounding as the server

  const num = (key: keyof Settings, label: string, min: number, max: number, note?: string) => (
    <Field>
      <FieldLabel htmlFor={key}>{label}</FieldLabel>
      <Input id={key} type="number" min={min} max={max} value={s[key] as number} onChange={(e) => set(key, Number(e.target.value) as never)} />
      {note && <FieldDescription>{note}</FieldDescription>}
    </Field>
  );
  const time = (key: "openMin" | "lastSlotMin" | "closeMin" | "pickupEndMin", label: string) => (
    <Field>
      <FieldLabel htmlFor={key}>{label}</FieldLabel>
      <Input id={key} type="time" value={toTime(s[key])} onChange={(e) => e.target.value && set(key, fromTime(e.target.value))} />
    </Field>
  );

  return (
    <>
      <PageTitle title="Settings" description="Changes apply to the customer pages straight away" />
      <Card className="max-w-3xl">
        <CardHeader><CardTitle>Open or pause</CardTitle></CardHeader>
        <CardContent>
          <FieldGroup>
            {SWITCHES.map((w) => (
              <Field key={w.key} orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor={w.key}>{w.label}</FieldLabel>
                  <FieldDescription>{w.note}</FieldDescription>
                </FieldContent>
                <Switch id={w.key} checked={s[w.key]} onCheckedChange={(v) => { set(w.key, v); act({ type: "settings", patch: { [w.key]: v } }, "Saved"); }} />
              </Field>
            ))}
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <form onSubmit={(e) => {
          e.preventDefault();
          const { bookingOpen, queueOpen, ordersOpen, ...patch } = s;
          void bookingOpen; void queueOpen; void ordersOpen;
          act({ type: "settings", patch }, "Settings saved");
        }}>
          <CardHeader>
            <CardTitle>Hours, slots and capacity</CardTitle>
            <CardDescription>{online} of {data.tables.length} tables can be booked online, the rest are kept for walk-ins</CardDescription>
          </CardHeader>
          <CardContent className="mt-4">
            <FieldGroup className="grid gap-4 sm:grid-cols-3">
              {time("openMin", "First slot")}
              {time("lastSlotMin", "Last slot starts")}
              {time("closeMin", "Service ends")}
              {time("pickupEndMin", "Last takeaway pickup")}
              {num("slotMin", "Slot length (min)", 15, 120, "At least the average stay")}
              {num("avgStayMin", "Average stay (min)", 10, 120)}
              {num("graceMin", "Late grace (min)", 0, 60)}
              <Field>
                <FieldLabel htmlFor="share">Bookable online (%)</FieldLabel>
                <Input id="share" type="number" min={0} max={100} step={5} value={Math.round(s.onlineShare * 100)} onChange={(e) => set("onlineShare", Number(e.target.value) / 100)} />
              </Field>
              {num("daysAhead", "Book days ahead", 1, 14)}
              {num("maxParty", "Largest online party", 1, 12)}
              {num("pickupCap", "Pickups per 15 min", 1, 500)}
            </FieldGroup>
            {s.slotMin < s.avgStayMin && (
              <Alert variant="destructive" className="mt-4"><AlertDescription>Slots are shorter than the average stay, so the next slot&apos;s guests will arrive before their tables are free.</AlertDescription></Alert>
            )}
          </CardContent>
          <CardFooter className="mt-6"><Button type="submit">Save settings</Button></CardFooter>
        </form>
      </Card>
    </>
  );
}
