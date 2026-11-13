"use client";
import { BellRing } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api, usePoll } from "@/lib/client";
import { TICKET_KEY } from "../JoinQueue";

type Ticket = {
  id: string;
  token: number;
  name: string;
  party: number;
  status: "waiting" | "called" | "seated" | "done" | "skipped" | "left";
  ahead: number;
  eta: number;
  nowServing: number | null;
  table_label: string | null;
};

export function LiveTicket({ id }: { id: string }) {
  const { data: t, error, refresh } = usePoll<Ticket>(`/api/queue/${id}`, 4000);
  const [leaving, setLeaving] = useState(false);
  const firstAhead = useRef<number | null>(null);
  const prevStatus = useRef<string | null>(null);

  useEffect(() => {
    if (!t) return;
    if (firstAhead.current === null && t.status === "waiting")
      firstAhead.current = Math.max(t.ahead, 1);
    if (t.status === "called" && prevStatus.current === "waiting")
      navigator.vibrate?.([300, 120, 300]);
    prevStatus.current = t.status;
    if (!["waiting", "called"].includes(t.status)) {
      try {
        if (localStorage.getItem(TICKET_KEY) === id)
          localStorage.removeItem(TICKET_KEY);
      } catch {}
    }
  }, [t, id]);

  if (error && !t) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Token not found</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/queue">Get a new token</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
  if (!t) return <Skeleton className="h-80 max-w-md" />;

  if (!["waiting", "called"].includes(t.status)) {
    const seated = t.status === "seated" || t.status === "done";
    return (
      <Empty className="max-w-md border">
        <EmptyHeader>
          <EmptyTitle>
            {seated
              ? "Enjoy your breakfast"
              : t.status === "left"
                ? "You left the queue"
                : "We missed you"}
          </EmptyTitle>
          <EmptyDescription>
            {seated
              ? t.table_label
                ? `You were seated at table ${t.table_label}.`
                : ""
              : t.status === "skipped"
                ? "Your token was called but we couldn't find you. Ask staff at the gate or take a new token."
                : "You can take a new token any time."}
          </EmptyDescription>
        </EmptyHeader>
        {!seated && (
          <EmptyContent>
            <Button asChild>
              <Link href="/queue">Get a new token</Link>
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  const called = t.status === "called";
  const progress = firstAhead.current
    ? (1 - t.ahead / firstAhead.current) * 100
    : 0;

  return (
    <div className="flex max-w-md flex-col gap-4">
      {called && (
        <Alert className="border-primary" role="alert">
          <BellRing />
          <AlertTitle>
            It&apos;s your turn, please come to the gate now
          </AlertTitle>
          <AlertDescription>
            Show this page to staff. Your table is held for 5 minutes.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardDescription>Your token</CardDescription>
          <CardTitle className="text-5xl tabular-nums">#{t.token}</CardTitle>
          <CardDescription>
            {t.name} · {t.party} {t.party === 1 ? "person" : "people"}
          </CardDescription>
        </CardHeader>
        {!called && (
          <CardContent className="flex flex-col gap-4">
            <Progress value={progress} aria-label="Progress in queue" />
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Ahead of you</p>
                <p className="text-xl font-semibold tabular-nums">{t.ahead}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Estimated wait</p>
                <p className="text-xl font-semibold tabular-nums">
                  {t.eta} min
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Now serving</p>
                <p className="text-xl font-semibold tabular-nums">
                  {t.nowServing ? `#${t.nowServing}` : "–"}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Keep this page open. It updates by itself and your phone vibrates
              when it&apos;s your turn.
            </p>
          </CardContent>
        )}
        <CardFooter className="mt-4">
          <Button
            variant="ghost"
            disabled={leaving}
            onClick={async () => {
              if (!confirm("Leave the queue? You'll lose your place.")) return;
              setLeaving(true);
              await api(`/api/queue/${id}`, {}).catch(() => {});
              setLeaving(false);
              refresh();
            }}
          >
            Leave the queue
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
