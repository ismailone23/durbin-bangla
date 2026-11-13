"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, usePoll } from "@/lib/client";
import { fmtDay, fmtTime } from "@/lib/format";

type Slot = { slot: string; left: Record<string, number>; free: number; total: number; past: boolean };
type Slots = { days: string[]; day: string; maxParty: number; bookingOpen: boolean; graceMin: number; slots: Slot[] };

/** Same rule as the server: some table size that fits the party still has room. */
const fits = (s: Slot, party: number) => Object.entries(s.left).some(([seats, n]) => +seats >= party && n > 0);

export function BookingFlow({ initial }: { initial?: { code: string; phone: string; party: number; day: string } }) {
  const router = useRouter();
  const [party, setParty] = useState(initial?.party ?? 2);
  const [day, setDay] = useState<string | null>(initial?.day ?? null);
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, refresh } = usePoll<Slots>(`/api/slots${day ? `?day=${day}` : ""}`, 15000);
  const activeDay = day ?? data?.day ?? "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (initial) {
        await api(`/api/bookings/${initial.code}`, { action: "reschedule", phone: initial.phone, day: activeDay, slot, party });
        router.push(`/booking/${initial.code}?changed=1`);
      } else {
        const b = await api<{ code: string }>("/api/bookings", { day: activeDay, slot, party, name, phone });
        router.push(`/booking/${b.code}?new=1`);
      }
    } catch (err) {
      setError((err as Error).message);
      refresh();
      setBusy(false);
    }
  }

  if (data && !data.bookingOpen) {
    return <Alert><AlertDescription>Online booking is paused right now. You can still join the walk-in queue at the restaurant.</AlertDescription></Alert>;
  }

  const noneLeft = data?.slots.every((s) => s.past || !fits(s, party));

  return (
    <Card>
      <form onSubmit={submit}>
        <CardContent>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>How many people</FieldLegend>
              <ToggleGroup type="single" variant="outline" value={String(party)} onValueChange={(v) => { if (v) { setParty(+v); setSlot(""); } }} className="flex-wrap">
                {Array.from({ length: data?.maxParty ?? 6 }, (_, i) => String(i + 1)).map((n) => (
                  <ToggleGroupItem key={n} value={n} className="w-11" aria-label={`${n} people`}>{n}</ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription>More than {data?.maxParty ?? 6}? Call +880 1730-015798 so we can join tables.</FieldDescription>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Day</FieldLegend>
              {!data ? <Skeleton className="h-9 w-72" /> : (
                <ToggleGroup type="single" variant="outline" value={activeDay} onValueChange={(v) => { if (v) { setDay(v); setSlot(""); } }} className="flex-wrap">
                  {data.days.map((d) => <ToggleGroupItem key={d} value={d} className="px-3">{fmtDay(d, data.days[0])}</ToggleGroupItem>)}
                </ToggleGroup>
              )}
            </FieldSet>

            <FieldSet>
              <FieldLegend>Time</FieldLegend>
              <FieldDescription>45 minutes per table. Tables are held {data?.graceMin ?? 10} minutes after your time.</FieldDescription>
              {!data ? <Skeleton className="h-24" /> : noneLeft ? (
                <Alert><AlertDescription>No online tables left for {party} on this day. Try another day, or join the walk-in queue when you arrive.</AlertDescription></Alert>
              ) : (
                <ToggleGroup type="single" variant="outline" spacing={2} value={slot} onValueChange={setSlot} className="grid w-full grid-cols-2 sm:grid-cols-4">
                  {data.slots.map((s) => {
                    const ok = !s.past && fits(s, party);
                    return (
                      <ToggleGroupItem key={s.slot} value={s.slot} disabled={!ok} className="h-auto flex-col items-start gap-0 py-2">
                        <span className="font-medium">{fmtTime(s.slot)}</span>
                        <span className="text-xs text-muted-foreground">{s.past ? "Started" : ok ? `${s.free} tables free` : "Full"}</span>
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>
              )}
            </FieldSet>

            {!initial && (
              <>
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="phone">Mobile number</FieldLabel>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" required />
                  <FieldDescription>Needed to change or cancel. One booking per number per day.</FieldDescription>
                </Field>
              </>
            )}

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" size="lg" disabled={busy || !slot || (!initial && (name.trim().length < 2 || phone.length < 11))}>
            {busy && <Spinner data-icon="inline-start" />}
            {initial ? "Move my booking" : "Confirm booking"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
