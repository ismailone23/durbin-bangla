"use client";
import { BellRing } from "lucide-react";
import { useState } from "react";
import { PageTitle, Stat, useStaff } from "@/components/staff/StaffShell";
import { type SeatParty, TablePicker } from "@/components/staff/TablePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ago } from "@/lib/format";

export default function QueuePage() {
  const { data, now, act } = useStaff();
  const [seat, setSeat] = useState<SeatParty | null>(null);
  if (!data) return <Skeleton className="h-[70vh]" />;

  const waiting = data.queue.filter((q) => q.status === "waiting");
  const called = data.queue.filter((q) => q.status === "called");
  const seated = data.queue.filter((q) => q.seated_at);
  const avgWait = seated.length ? Math.round(seated.reduce((a, q) => a + (q.seated_at! - q.created_at), 0) / seated.length / 60e3) : null;

  return (
    <>
      <PageTitle title="Walk-in queue" description={data.queueSummary.open ? "Guests join by scanning the QR code at the gate" : "The queue is closed. Open it in Settings."}>
        <Button onClick={() => act({ type: "callNext" }, "Next token called")} disabled={!waiting.length}>
          <BellRing data-icon="inline-start" />Call next{waiting[0] ? ` (#${waiting[0].token})` : ""}
        </Button>
      </PageTitle>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Waiting" value={waiting.length} note={`~${data.queueSummary.eta} min for a new guest`} />
        <Stat label="Called" value={called.length} note="On their way to the gate" />
        <Stat label="Seated today" value={seated.length} note={avgWait !== null ? `Average wait ${avgWait} min` : undefined} />
        <Stat label="Free tables" value={data.tables.filter((t) => t.status === "free").length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Called</CardTitle>
          <CardDescription>Skip a guest who hasn&apos;t come after 5 minutes</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {called.length === 0 && <p className="text-sm text-muted-foreground">Nobody called right now</p>}
          {called.map((q) => {
            const late = now - (q.called_at ?? now) >= 5 * 60e3;
            return (
              <div key={q.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="text-sm">
                  <p className="text-lg font-semibold tabular-nums">#{q.token} <span className="text-sm font-normal">{q.name}, {q.party}p</span></p>
                  <p className={late ? "text-primary" : "text-muted-foreground"}>Called {ago(q.called_at!, now)} ago · <a href={`tel:${q.phone}`} className="underline underline-offset-4">{q.phone}</a></p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => setSeat({ kind: "queue", id: q.id, size: q.party, who: `#${q.token} ${q.name}` })}>Seat</Button>
                  <Button size="sm" variant="ghost" onClick={() => act({ type: "ticket", id: q.id, status: "skipped" }, `#${q.token} skipped`)}>Skip</Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Token</TableHead><TableHead>Guest</TableHead><TableHead>Party</TableHead><TableHead>Waiting</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {waiting.map((q, i) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium tabular-nums">#{q.token} {i === 0 && <Badge className="ml-1">Next</Badge>}</TableCell>
                <TableCell><p>{q.name}</p><p className="text-xs text-muted-foreground">{q.phone}</p></TableCell>
                <TableCell className="tabular-nums">{q.party}</TableCell>
                <TableCell className="text-muted-foreground">{ago(q.created_at, now)}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => act({ type: "ticket", id: q.id, status: "called" }, `#${q.token} called`)}>Call</Button></TableCell>
              </TableRow>
            ))}
            {waiting.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nobody is waiting</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <TablePicker party={seat} onClose={() => setSeat(null)} />
    </>
  );
}
