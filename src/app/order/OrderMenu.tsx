"use client";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { api, usePoll } from "@/lib/client";
import { fmtTime, taka } from "@/lib/format";

type Item = {
  id: number;
  name: string;
  name_bn: string;
  description: string;
  category: string;
  price: number;
  remaining: number;
  takeaway: number;
  signature: number;
};
type Menu = {
  ordersOpen: boolean;
  menu: Item[];
  windows: { time: string; left: number; past: boolean }[];
};

const lines_count = (cart: Record<number, number>) =>
  Object.values(cart).reduce((a, q) => a + q, 0);

export function OrderMenu() {
  const router = useRouter();
  const { data, refresh } = usePoll<Menu>("/api/menu", 15000);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [pickup, setPickup] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);

  if (data && !data.ordersOpen)
    return (
      <Alert>
        <AlertDescription>
          Takeaway pre-orders are paused right now. Please check back soon.
        </AlertDescription>
      </Alert>
    );

  const items = data?.menu.filter((m) => m.takeaway) ?? [];
  const categories = [...new Set(items.map((i) => i.category))];
  const active = section && categories.includes(section) ? section : categories[0];
  const count = lines_count(cart);
  const lines = items.filter((i) => cart[i.id]);
  const total = lines.reduce((a, i) => a + cart[i.id] * i.price, 0);
  const windows = data?.windows.filter((w) => !w.past && w.left > 0) ?? [];
  const setQty = (id: number, q: number) =>
    setCart(({ [id]: _, ...rest }) => (q > 0 ? { ...rest, [id]: q } : rest));

  async function place(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const o = await api<{ code: string }>("/api/orders", {
        name,
        phone,
        pickup,
        items: lines.map((i) => ({ id: i.id, qty: cart[i.id] })),
      });
      router.push(`/order/${o.code}?new=1`);
    } catch (err) {
      setError((err as Error).message);
      refresh();
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-6">
        {!data && <Skeleton className="h-96" />}
        {/* One section at a time: the printed menu's sections as tabs. */}
        <div role="group" aria-label="Menu sections" className="flex gap-2 max-sm:-mx-(--gutter) max-sm:overflow-x-auto max-sm:px-(--gutter) max-sm:pb-1 sm:flex-wrap">
          {categories.map((cat) => {
            const inCart = items.filter((i) => i.category === cat).reduce((a, i) => a + (cart[i.id] ?? 0), 0);
            return (
              <Button
                key={cat}
                type="button"
                variant={cat === active ? "default" : "outline"}
                aria-pressed={cat === active}
                onClick={() => setSection(cat)}
              >
                {cat}
                {inCart > 0 && <span className="tabular-nums opacity-80">· {inCart}</span>}
              </Button>
            );
          })}
        </div>

        <ul className="grid gap-3 sm:grid-cols-2" aria-label={active}>
          {items
            .filter((i) => i.category === active)
            .map((item) => {
              const q = cart[item.id] ?? 0;
              return (
                <li
                  key={item.id}
                  className={`flex min-h-20 items-center justify-between gap-4 bg-card px-4 py-3 ${item.remaining === 0 ? "opacity-55" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug">
                      {item.name}
                      {item.name_bn && (
                        <span className="font-bn ml-2 font-normal text-muted-foreground" lang="bn">{item.name_bn}</span>
                      )}
                    </p>
                    {item.description && <p className="text-muted-foreground">{item.description}</p>}
                    <p className="mt-1 tabular-nums">
                      {taka(item.price)}
                      {item.remaining === 0
                        ? " · Sold out"
                        : item.remaining < 30 && ` · ${item.remaining} left`}
                    </p>
                  </div>
                  {item.remaining > 0 &&
                    (q ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setQty(item.id, q - 1)}
                          aria-label={`One less ${item.name}`}
                        >
                          <Minus />
                        </Button>
                        <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">
                          {q}
                        </span>
                        <Button
                          size="icon"
                          disabled={q >= Math.min(20, item.remaining)}
                          onClick={() => setQty(item.id, q + 1)}
                          aria-label={`One more ${item.name}`}
                        >
                          <Plus />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="shrink-0"
                        onClick={() => setQty(item.id, 1)}
                        aria-label={`Add ${item.name}`}
                      >
                        <Plus /> Add
                      </Button>
                    ))}
                </li>
              );
            })}
        </ul>
      </div>

      <Card className="scroll-mt-24 lg:sticky lg:top-24" id="bag">
        <form onSubmit={place}>
          <CardHeader>
            <CardTitle>Your order</CardTitle>
            <CardDescription>Pay when you collect</CardDescription>
          </CardHeader>
          <CardContent className="mt-4 flex flex-col gap-4">
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add items from the menu
              </p>
            ) : (
              <>
                <ul className="flex flex-col gap-1 text-sm">
                  {lines.map((i) => (
                    <li key={i.id} className="flex justify-between gap-2">
                      <span>
                        {cart[i.id]} × {i.name}
                      </span>
                      <span className="tabular-nums">
                        {taka(i.price * cart[i.id])}
                      </span>
                    </li>
                  ))}
                </ul>
                <Separator />
                <p className="flex justify-between font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">{taka(total)}</span>
                </p>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="pickup">Pickup time today</FieldLabel>
                    <Select value={pickup} onValueChange={setPickup}>
                      <SelectTrigger id="pickup" className="w-full">
                        <SelectValue
                          placeholder={
                            windows.length
                              ? "Choose a time"
                              : "No times left today"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {windows.map((w) => (
                            <SelectItem key={w.time} value={w.time}>
                              {fmtTime(w.time)} · {w.left} slots left
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="o-name">Name</FieldLabel>
                    <Input
                      id="o-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="o-phone">Mobile number</FieldLabel>
                    <Input
                      id="o-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="01XXXXXXXXX"
                      required
                    />
                  </Field>
                </FieldGroup>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
          {lines.length > 0 && (
            <CardFooter className="mt-4">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={
                  busy || !pickup || name.trim().length < 2 || phone.length < 11
                }
              >
                {busy && <Spinner data-icon="inline-start" />}Place order ·{" "}
                {taka(total)}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      {lines.length > 0 && (
        <Button
          asChild
          size="lg"
          className="fixed inset-x-4 bottom-4 z-30 lg:hidden"
        >
          <a href="#bag">View order · {count} {count === 1 ? "item" : "items"} · {taka(total)}</a>
        </Button>
      )}
    </div>
  );
}
