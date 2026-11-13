"use client";
import { CheckCircle2, PackageCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { usePoll } from "@/lib/client";
import { fmtTime, taka } from "@/lib/format";

type Order = {
  code: string;
  pickup: string;
  name: string;
  status: "placed" | "preparing" | "ready" | "collected" | "cancelled";
  total: number;
  items: { name: string; name_bn: string; qty: number; price: number }[];
};

const STAGES = ["placed", "preparing", "ready", "collected"] as const;
const LABEL = {
  placed: "Order received",
  preparing: "In the kitchen",
  ready: "Ready at the pickup counter",
  collected: "Collected",
  cancelled: "Cancelled",
};

export function OrderStatus({ code }: { code: string }) {
  const params = useSearchParams();
  const { data: o, error } = usePoll<Order>(`/api/orders/${code}`, 5000);
  const [qr, setQr] = useState("");
  useEffect(() => {
    QRCode.toDataURL(code, { margin: 1, width: 200 }).then(setQr);
  }, [code]);

  if (error && !o) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Order not found</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/order">Start an order</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
  if (!o) return <Skeleton className="h-96 max-w-md" />;

  const step = STAGES.indexOf(o.status as (typeof STAGES)[number]);

  return (
    <div className="flex max-w-md flex-col gap-4">
      {o.status === "ready" ? (
        <Alert className="border-primary">
          <PackageCheck />
          <AlertTitle>Your order is ready</AlertTitle>
          <AlertDescription>
            Go to the pickup counter and show this code. No need to queue.
          </AlertDescription>
        </Alert>
      ) : (
        params.get("new") &&
        o.status === "placed" && (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Order placed</AlertTitle>
            <AlertDescription>
              Keep this page open to follow it. Pay at pickup.
            </AlertDescription>
          </Alert>
        )
      )}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardDescription>Order code</CardDescription>
            <CardTitle className="font-mono text-3xl tracking-widest">
              {o.code}
            </CardTitle>
            <CardDescription>
              {o.name} · pickup {fmtTime(o.pickup)}
            </CardDescription>
          </div>
          {qr && (
            <img
              src={qr}
              alt={`QR code for order ${o.code}`}
              className="size-20"
            />
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {o.status === "cancelled" ? (
            <Badge variant="destructive">Cancelled</Badge>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{LABEL[o.status]}</span>
                <span className="text-muted-foreground">
                  Step {step + 1} of 4
                </span>
              </div>
              <Progress
                value={((step + 1) / STAGES.length) * 100}
                aria-label="Order progress"
              />
            </div>
          )}
          <Separator />
          <ul className="flex flex-col gap-1 text-sm">
            {o.items.map((i) => (
              <li key={i.name} className="flex justify-between gap-2">
                <span>
                  {i.qty} × {i.name}
                </span>
                <span className="tabular-nums">{taka(i.qty * i.price)}</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between font-medium">
            <span>Total, pay at pickup</span>
            <span className="tabular-nums">{taka(o.total)}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
