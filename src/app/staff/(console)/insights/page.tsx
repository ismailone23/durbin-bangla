"use client";
import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { PageTitle, Stat } from "@/components/staff/StaffShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePoll } from "@/lib/client";
import { fmtTime, taka } from "@/lib/format";

type Day = { day: string; booked: number; showed: number; noShow: number; covers: number; walkins: number; walkinsSeated: number; avgWait: number | null; pickups: number; revenue: number };
type Data = {
  perDay: Day[];
  arrivalCurve: { time: string; avg: number }[];
  top: { name: string; qty: number }[];
  totals: { booked: number; noShow: number; walkins: number; pickups: number; revenue: number; covers: number; showRate: number | null; avgWait: number | null };
};

// Clay + turmeric pass the colour-blind check (ΔE 22.5); turmeric is low contrast, so the chart keeps a legend and tooltip.
const daily = {
  showed: { label: "Booked parties seated", color: "var(--chart-1)" },
  walkinsSeated: { label: "Walk-in parties seated", color: "var(--chart-2)" },
} satisfies ChartConfig;
const arrivals = { avg: { label: "Tokens per 15 min", color: "var(--chart-1)" } } satisfies ChartConfig;

export default function InsightsPage() {
  const [days, setDays] = useState("7");
  const { data } = usePoll<Data>(`/api/staff/insights?days=${days}`, 30000);

  return (
    <>
      <PageTitle title="Insights" description="How the morning rush is moving, including today so far">
        <ToggleGroup type="single" variant="outline" value={days} onValueChange={(v) => v && setDays(v)}>
          <ToggleGroupItem value="7">Last 7 days</ToggleGroupItem>
          <ToggleGroupItem value="30">Last 30 days</ToggleGroupItem>
        </ToggleGroup>
      </PageTitle>

      {!data ? <Skeleton className="h-[70vh]" /> : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Stat label="Guests served" value={data.totals.covers.toLocaleString("en-IN")} />
            <Stat label="Show-up rate" value={data.totals.showRate !== null ? `${data.totals.showRate}%` : "–"} note={`${data.totals.noShow} no-shows of ${data.totals.booked} bookings`} />
            <Stat label="Walk-in tokens" value={data.totals.walkins.toLocaleString("en-IN")} />
            <Stat label="Average walk-in wait" value={data.totals.avgWait !== null ? `${data.totals.avgWait} min` : "–"} note="Token to table" />
            <Stat label="Pre-order sales" value={taka(data.totals.revenue)} note={`${data.totals.pickups} pickups`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Parties seated per day</CardTitle>
              <CardDescription>Online bookings next to walk-in tokens</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={daily} className="h-72 w-full">
                <BarChart data={data.perDay} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickFormatter={(d: string) => new Date(`${d}T00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="showed" fill="var(--color-showed)" radius={4} />
                  <Bar dataKey="walkinsSeated" fill="var(--color-walkinsSeated)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>When walk-ins arrive</CardTitle>
                <CardDescription>Average tokens taken per 15 minutes. Put more staff at the gate at the peak.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={arrivals} className="h-56 w-full">
                  <AreaChart data={data.arrivalCurve} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} tickFormatter={fmtTime} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} width={32} />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(t) => fmtTime(String(t))} />} />
                    <Area dataKey="avg" type="monotone" stroke="var(--color-avg)" fill="var(--color-avg)" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top takeaway items</CardTitle>
                <CardDescription>Portions pre-ordered</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {data.top.map((t) => (
                  <div key={t.name} className="flex flex-col gap-1.5 text-sm">
                    <div className="flex justify-between"><span>{t.name}</span><span className="tabular-nums text-muted-foreground">{t.qty.toLocaleString("en-IN")}</span></div>
                    <Progress value={(t.qty / (data.top[0]?.qty || 1)) * 100} aria-label={`${t.name} share`} />
                  </div>
                ))}
                {data.top.length === 0 && <p className="text-sm text-muted-foreground">No orders yet</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
