"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Mark } from "@/components/site";
import { useNow, usePoll, useServerOffset } from "@/lib/client";
import { dhakaClock } from "@/lib/format";

type BoardData = {
  now: number;
  queue: { open: boolean; waiting: number; eta: number; nowServing: number | null };
  called: { token: number; at: number }[];
  next: number[];
  ready: string[];
  soldOut: string[];
  signatures: { id: number; name: string; name_bn: string; remaining: number }[];
};

export function Board() {
  const { data } = usePoll<BoardData>("/api/board", 4000);
  const now = useNow(1000, useServerOffset(data?.now));
  const [qr, setQr] = useState("");
  useEffect(() => {
    QRCode.toDataURL(`${location.origin}/queue`, { margin: 1, width: 280 }).then(setQr);
  }, []);
  const called = (data?.called ?? []).slice(-6).reverse();

  return (
    <div className="site deep flex min-h-dvh flex-col gap-10 p-10" style={{ background: "var(--deep)", color: "var(--deep-ink)" }}>
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-4" aria-label="Durbin Bangla website">
          <Mark className="size-14" />
          <div>
            <p className="bn text-4xl font-semibold" lang="bn">দূরবীন বাংলা</p>
            <p className="text-xl" style={{ color: "var(--deep-soft)" }}>Walk-in queue and takeaway pickup</p>
          </div>
        </Link>
        <div className="flex items-center gap-10">
          <Link href="/" className="link text-xl font-semibold">Back to website</Link>
          <p className="display text-7xl tabular-nums">{dhakaClock(now)}</p>
        </div>
      </header>

      <div className="grid flex-1 gap-10 lg:grid-cols-[1.5fr_1fr]">
        <section className="flex flex-col gap-10 p-10" style={{ background: "var(--deep-2)" }}>
          <h2 className="text-3xl font-semibold">Now calling, please come to the gate</h2>
          <div className="flex flex-wrap items-end gap-5">
            {called.map((c, i) => (
              <div key={c.token} className={i === 0 ? "display bg-primary px-12 py-8 text-[11rem] text-primary-foreground tabular-nums" : "display px-6 py-4 text-8xl tabular-nums"} style={i ? { background: "var(--deep)" } : undefined}>
                #{c.token}
              </div>
            ))}
            {data && called.length === 0 && <p className="text-3xl" style={{ color: "var(--deep-soft)" }}>The next token will show here</p>}
          </div>
          <div className="mt-auto">
            <p className="text-2xl" style={{ color: "var(--deep-soft)" }}>Up next</p>
            <p className="display mt-3 text-7xl tabular-nums">{data?.next.length ? data.next.map((t) => `#${t}`).join("   ") : "–"}</p>
          </div>
        </section>

        <div className="flex flex-col gap-10">
          <section className="p-10" style={{ background: "var(--deep-2)" }}>
            <h2 className="text-3xl font-semibold">Takeaway ready</h2>
            <div className="mt-6 flex flex-wrap gap-4">
              {(data?.ready ?? []).slice(0, 10).map((c) => <span key={c} className="display px-5 py-3 text-5xl tracking-wide" style={{ background: "var(--deep)" }}>{c}</span>)}
              {data && data.ready.length === 0 && <p className="text-2xl" style={{ color: "var(--deep-soft)" }}>No orders waiting</p>}
            </div>
          </section>
          <section className="flex flex-1 items-center gap-8 p-10" style={{ background: "var(--wall)", color: "var(--wall-ink)" }}>
            {qr && <img src={qr} alt="Scan to join the walk-in queue" className="size-44" />}
            <div>
              <h2 className="text-3xl font-semibold">Scan to get a token</h2>
              <p className="bn mt-1 text-2xl" lang="bn">লাইনে না দাঁড়িয়ে টোকেন নিন</p>
              <p className="mt-4 text-2xl tabular-nums">{data ? `${data.queue.waiting} waiting · about ${data.queue.eta} min` : "–"}</p>
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}
