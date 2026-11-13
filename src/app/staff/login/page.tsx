"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/site";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/client";

export default function StaffLogin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid min-h-dvh place-items-center bg-secondary/50 px-4">
      <Card className="w-full max-w-sm">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api("/api/staff/login", { pin });
              router.replace("/staff");
            } catch (x) {
              setError((x as Error).message);
              setPin("");
              setBusy(false);
            }
          }}
        >
          <CardHeader>
            <Logo sub="Staff" />
            <CardTitle className="mt-4">Staff login</CardTitle>
            <CardDescription>Enter the staff PIN</CardDescription>
          </CardHeader>
          <CardContent className="mt-4">
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="pin">PIN</FieldLabel>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(null);
                }}
                aria-invalid={!!error}
                autoFocus
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
          </CardContent>
          <CardFooter className="mt-6">
            <Button type="submit" className="w-full" disabled={!pin || busy}>
              {busy && <Spinner data-icon="inline-start" />}Log in
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
