"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { useStaff } from "./StaffShell";

export type SeatParty = { kind: "booking"; code: string; size: number; who: string } | { kind: "queue"; id: string; size: number; who: string };

/** Free tables that fit the party, smallest first. */
export function TablePicker({ party, onClose }: { party: SeatParty | null; onClose: () => void }) {
  const { data, act } = useStaff();
  const free = (data?.tables ?? []).filter((t) => t.status === "free" && party && t.seats >= party.size).sort((a, b) => a.seats - b.seats || a.id - b.id);

  return (
    <Dialog open={!!party} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Seat {party?.who}</DialogTitle>
          <DialogDescription>Party of {party?.size}. Free tables that fit, best fit first.</DialogDescription>
        </DialogHeader>
        {free.length === 0 ? (
          <Empty><EmptyHeader><EmptyDescription>No free table fits right now. Clear or ready a table on the floor first.</EmptyDescription></EmptyHeader></Empty>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {free.map((t, i) => (
              <Button
                key={t.id}
                variant={i === 0 ? "default" : "outline"}
                className="h-auto flex-col py-2"
                onClick={async () => {
                  if (!party) return;
                  const p = party.kind === "booking" ? { kind: "booking", code: party.code } : { kind: "queue", id: party.id };
                  if (await act({ type: "seat", tableId: t.id, party: p }, `${party.who} seated at ${t.label}`)) onClose();
                }}
              >
                <span className="text-base">{t.label}</span>
                <span className="text-xs opacity-80">{t.seats} seats</span>
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
