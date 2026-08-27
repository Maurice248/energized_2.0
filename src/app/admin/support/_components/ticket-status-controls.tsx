"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/trpc/client";

type TicketStatus = "open" | "in_progress" | "closed";

const ACTIONS: { status: TicketStatus; label: string }[] = [
  { status: "in_progress", label: "In progress" },
  { status: "closed", label: "Close" },
  { status: "open", label: "Reopen" },
];

export function TicketStatusControls({
  ticketId,
  status,
}: {
  ticketId: string;
  status: TicketStatus;
}) {
  const router = useRouter();
  const mutate = api.admin.support.setTicketStatus.useMutation({
    onSuccess: (row) => {
      const label =
        row.status === "in_progress"
          ? "In progress"
          : row.status === "closed"
            ? "Closed"
            : "Open";
      toast.success(`Ticket marked ${label}.`);
      router.refresh();
    },
    onError: (err) => toast.error(err.message || "Couldn't update ticket."),
  });

  const visible = ACTIONS.filter((action) => {
    if (action.status === status) return false;
    if (status === "closed" && action.status === "in_progress") return false;
    return true;
  });

  return (
    <div className="v2-ticket-actions">
      {visible.map((action) => (
        <button
          key={action.status}
          type="button"
          className="v2-btn v2-btn-ghost v2-btn-sm"
          disabled={mutate.isPending}
          onClick={() => mutate.mutate({ id: ticketId, status: action.status })}
        >
          {mutate.isPending && mutate.variables?.status === action.status
            ? "Saving…"
            : action.label}
        </button>
      ))}
    </div>
  );
}
