"use client";
import { Search } from "lucide-react";
import { useState } from "react";
import { type BookingRow, PageTitle, Stat, useStaff } from "@/components/staff/StaffShell";
import { type SeatParty, TablePicker } from "@/components/staff/TablePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtTime } from "@/lib/format";

const LABEL: Record<BookingRow["status"], string> = { booked: "Booked", arrived: "At the gate", seated: "Seated", completed: "Done", no_show: "No-show", cancelled: "Cancelled" };

export default function BookingsPage() {
  const { data, act } = useStaff();
  const [find, setFind] = useState("");
  const [slot, setSlot] = useState("current");
  const [seat, setSeat] = useState<SeatParty | null>(null);
  if (!data) return <Skeleton className="h-[70vh]" />;

  const active = data.bookings.filter((b) => b.status !== "cancelled");
  const slots = [...new Set(data.bookings.map((b) => b.slot))];
  const f = find.trim().toLowerCase();
  const show = slot === "current" ? data.currentSlot : slot;
  const rows = data.bookings.filter((b) => (f ? [b.code, b.name, b.phone].some((v) => v.toLowerCase().includes(f)) : show === "all" || b.slot === show));

  return (
    <>
      <PageTitle title="Today's bookings" description="Check guests in at the gate. Search by code, name or phone." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Bookings today" value={active.length} note={`${active.reduce((a, b) => a + b.party, 0)} guests`} />
        <Stat label="Checked in" value={active.filter((b) => ["arrived", "seated", "completed"].includes(b.status)).length} />
        <Stat label="Late now" value={data.bookings.filter((b) => b.late).length} note={`Over ${data.settings.graceMin} min after their time`} alert={data.bookings.some((b) => b.late)} />
        <Stat label="No-shows" value={active.filter((b) => b.status === "no_show").length} />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search" className="pl-8" aria-label="Search bookings" />
        </div>
        <Select value={slot} onValueChange={(v) => { setSlot(v); setFind(""); }}>
          <SelectTrigger className="w-44" aria-label="Slot"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="current">Current slot</SelectItem>
              {slots.map((s) => <SelectItem key={s} value={s}>{fmtTime(s)}</SelectItem>)}
              <SelectItem value="all">All slots</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Code</TableHead><TableHead>Guest</TableHead><TableHead>Party</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((b) => (
              <TableRow key={b.code} className={["cancelled", "no_show", "completed"].includes(b.status) ? "text-muted-foreground" : undefined}>
                <TableCell className="font-mono">{b.code}</TableCell>
                <TableCell><p className="font-medium">{b.name}</p><p className="text-xs text-muted-foreground">{b.phone}</p></TableCell>
                <TableCell className="tabular-nums">{b.party}</TableCell>
                <TableCell>{fmtTime(b.slot)}</TableCell>
                <TableCell className="flex gap-1">
                  <Badge variant={b.status === "arrived" ? "default" : "secondary"}>{LABEL[b.status]}{b.table_label ? ` · ${b.table_label}` : ""}</Badge>
                  {b.late && <Badge variant="destructive">Late</Badge>}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {b.status === "booked" && <Button size="sm" variant="outline" onClick={() => act({ type: "booking", code: b.code, status: "arrived" }, `${b.name} checked in`)}>Check in</Button>}
                    {(b.status === "booked" || b.status === "arrived") && <Button size="sm" onClick={() => setSeat({ kind: "booking", code: b.code, size: b.party, who: b.name })}>Seat</Button>}
                    {b.status === "booked" && b.late && <Button size="sm" variant="ghost" onClick={() => act({ type: "booking", code: b.code, status: "no_show" }, `${b.name} marked no-show`)}>No-show</Button>}
                    {(b.status === "no_show" || b.status === "arrived") && <Button size="sm" variant="ghost" onClick={() => act({ type: "booking", code: b.code, status: "booked" })}>Undo</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No bookings here</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <TablePicker party={seat} onClose={() => setSeat(null)} />
    </>
  );
}
