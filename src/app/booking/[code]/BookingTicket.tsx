"use client";
import { CalendarPlus, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { BookingFlow } from "@/app/book/BookingFlow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { api, useNow, usePoll, useServerOffset } from "@/lib/client";
import { fmtDay, fmtTime } from "@/lib/format";

type Booking = {
  code: string;
  day: string;
  slot: string;
  party: number;
  seats: number;
  name: string;
  status:
    | "booked"
    | "arrived"
    | "seated"
    | "completed"
    | "no_show"
    | "cancelled";
  phoneHint: string;
  graceMin: number;
  startsAt: number;
  now: number;
};

const STATUS: Record<Booking["status"], string> = {
  booked: "Confirmed",
  arrived: "Checked in",
  seated: "Seated",
  completed: "Completed",
  no_show: "Missed",
  cancelled: "Cancelled",
};

function downloadIcs(b: Booking) {
  const fmt = (ms: number) =>
    new Date(ms)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Durbin Bangla//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${b.code}@durbinbangla`,
    `DTSTAMP:${fmt(Date.now())}`,
    `DTSTART:${fmt(b.startsAt)}`,
    `DTEND:${fmt(b.startsAt + 45 * 60e3)}`,
    `SUMMARY:Breakfast at Durbin Bangla (${b.party})`,
    `DESCRIPTION:Booking code ${b.code}. Arrive within ${b.graceMin} minutes.`,
    "LOCATION:40 Bir Uttam A K Khandokar Road\\, Mohakhali\\, Dhaka",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  a.download = `durbin-bangla-${b.code}.ics`;
  a.click();
}

function countdown(ms: number, graceMin: number) {
  if (ms <= -graceMin * 60e3) return "Your time has passed";
  if (ms <= 0) return "Now, please come to the gate";
  const d = Math.floor(ms / 864e5),
    h = Math.floor((ms % 864e5) / 3600e3),
    m = Math.floor((ms % 3600e3) / 60e3);
  return `Starts in ${d ? `${d}d ` : ""}${h}h ${m}m`;
}

export function BookingTicket({ code }: { code: string }) {
  const params = useSearchParams();
  const {
    data: b,
    error,
    refresh,
  } = usePoll<Booking>(`/api/bookings/${code}`, 20000);
  const now = useNow(30000, useServerOffset(b?.now));
  const [qr, setQr] = useState("");
  const [changing, setChanging] = useState<string | null>(null); // verified phone

  useEffect(() => {
    QRCode.toDataURL(`${location.origin}/booking/${code}`, {
      margin: 1,
      width: 320,
    }).then(setQr);
  }, [code]);

  if (error && !b) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Booking not found</EmptyTitle>
          <EmptyDescription>Check the code and try again.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/book">Make a booking</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
  if (!b) return <Skeleton className="h-120 max-w-md" />;
  if (changing)
    return (
      <BookingFlow
        initial={{ code: b.code, phone: changing, party: b.party, day: b.day }}
      />
    );

  const active = b.status === "booked";

  return (
    <div className="flex max-w-md flex-col gap-4">
      {active && (params.get("new") || params.get("changed")) && (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>
            {params.get("new") ? "You're booked" : "Booking moved"}
          </AlertTitle>
          <AlertDescription>
            Take a screenshot of this page, or add it to your calendar.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{b.name}</CardTitle>
          <CardDescription>
            {fmtDay(b.day)} · {fmtTime(b.slot)} · {b.party}{" "}
            {b.party === 1 ? "person" : "people"}
          </CardDescription>
          <Badge variant={active ? "default" : "secondary"} className="w-fit">
            {STATUS[b.status]}
          </Badge>
        </CardHeader>
        <Separator />
        <CardContent className="flex flex-col items-center gap-2 text-center">
          {qr ? (
            <img
              src={qr}
              alt={`QR code for booking ${b.code}`}
              className="size-40"
            />
          ) : (
            <Skeleton className="size-40" />
          )}
          <p className="text-sm text-muted-foreground">Show this at the gate</p>
          <p className="font-mono text-3xl font-semibold tracking-widest">
            {b.code}
          </p>
          {active && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-4" />
              {countdown(b.startsAt - now, b.graceMin)}
            </p>
          )}
        </CardContent>
        {active && (
          <CardFooter className="flex flex-col items-stretch gap-3">
            <p className="text-sm text-muted-foreground">
              Your table is held for {b.graceMin} minutes after{" "}
              {fmtTime(b.slot)}, then it goes to the walk-in queue.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => downloadIcs(b)}>
                <CalendarPlus data-icon="inline-start" />
                Add to calendar
              </Button>
              <PhoneCheck
                title="Change this booking"
                hint={b.phoneHint}
                action="Continue"
                onOk={async (phone) => {
                  if (
                    phone.replace(/\D/g, "").slice(-4) !== b.phoneHint.slice(-4)
                  )
                    throw new Error("That number doesn't match this booking");
                  setChanging(phone);
                }}
              >
                <Button variant="outline">Change</Button>
              </PhoneCheck>
              <PhoneCheck
                title="Cancel this booking?"
                hint={b.phoneHint}
                action="Cancel booking"
                destructive
                onOk={async (phone) => {
                  await api(`/api/bookings/${code}`, {
                    action: "cancel",
                    phone,
                  });
                  refresh();
                }}
              >
                <Button variant="ghost">Cancel</Button>
              </PhoneCheck>
            </div>
          </CardFooter>
        )}
      </Card>
      {b.status === "cancelled" && (
        <Button asChild>
          <Link href="/book">Make a new booking</Link>
        </Button>
      )}
    </div>
  );
}

function PhoneCheck({
  title,
  hint,
  action,
  destructive,
  onOk,
  children,
}: {
  title: string;
  hint: string;
  action: string;
  destructive?: boolean;
  onOk: (phone: string) => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setErr(null);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await onOk(phone);
              setOpen(false);
            } catch (x) {
              setErr((x as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Enter the mobile number used for the booking ({hint}).
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={!!err}>
            <FieldLabel htmlFor="verify-phone">Mobile number</FieldLabel>
            <Input
              id="verify-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="01XXXXXXXXX"
              aria-invalid={!!err}
              autoFocus
            />
            {err && <FieldError>{err}</FieldError>}
          </Field>
          <DialogFooter>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              disabled={busy || phone.length < 11}
            >
              {busy && <Spinner data-icon="inline-start" />}
              {action}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
