"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, usePoll } from "@/lib/client";

type Summary = {
  open: boolean;
  waiting: number;
  eta: number;
  nowServing: number | null;
};
export const TICKET_KEY = "durbin-ticket";

export function JoinQueue() {
  const router = useRouter();
  const { data } = usePoll<Summary>("/api/queue", 8000);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [party, setParty] = useState("2");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<string | null>(null);

  useEffect(() => {
    try {
      setExisting(localStorage.getItem(TICKET_KEY));
    } catch {}
  }, []);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const t = await api<{ id: string }>("/api/queue", {
        name,
        phone,
        party: +party,
      });
      try {
        localStorage.setItem(TICKET_KEY, t.id);
      } catch {}
      router.push(`/queue/${t.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-6 md:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Queue right now</CardTitle>
          <CardDescription>
            {data?.open === false ? "Closed" : "Updates every few seconds"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Waiting</p>
            <p className="text-3xl font-semibold tabular-nums">
              {data?.waiting ?? "–"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Estimated wait</p>
            <p className="text-3xl font-semibold tabular-nums">
              {data ? `${data.eta} min` : "–"}
            </p>
          </div>
          {data?.nowServing && (
            <p className="col-span-2 text-sm text-muted-foreground">
              Now serving token #{data.nowServing}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        {data?.open === false ? (
          <CardHeader>
            <CardTitle>The walk-in queue is closed</CardTitle>
            <CardDescription>
              It opens an hour before breakfast and closes 30 minutes before the
              end of service.
            </CardDescription>
            <Button asChild className="mt-2 w-fit">
              <Link href="/book">Book a table instead</Link>
            </Button>
          </CardHeader>
        ) : (
          <form onSubmit={join}>
            <CardHeader>
              <CardTitle>Get a token</CardTitle>
              <CardDescription>
                For guests at or near the restaurant. Wait anywhere, we show
                your place live.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-4">
              <FieldGroup>
                {existing && (
                  <Alert>
                    <AlertTitle>
                      You already have a token on this phone
                    </AlertTitle>
                    <AlertDescription>
                      <Link
                        href={`/queue/${existing}`}
                        className="underline underline-offset-4"
                      >
                        Open my token
                      </Link>
                    </AlertDescription>
                  </Alert>
                )}
                <Field>
                  <FieldLabel htmlFor="q-name">Name</FieldLabel>
                  <Input
                    id="q-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                    maxLength={60}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="q-phone">Mobile number</FieldLabel>
                  <Input
                    id="q-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    placeholder="01XXXXXXXXX"
                  />
                  <FieldDescription>
                    Staff call you if you miss your turn
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>People</FieldLabel>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={party}
                    onValueChange={(v) => v && setParty(v)}
                    className="flex-wrap"
                  >
                    {["1", "2", "3", "4", "5", "6", "7", "8"].map((n) => (
                      <ToggleGroupItem key={n} value={n} className="w-10">
                        {n}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </FieldGroup>
            </CardContent>
            <CardFooter className="mt-6">
              <Button type="submit" size="lg" disabled={busy}>
                {busy && <Spinner data-icon="inline-start" />}Join the queue{" "}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
