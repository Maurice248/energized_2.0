"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/trpc/client";
import { Icon } from "@/components/shared/icon";

const MAX_MESSAGE = 1000;

export function IntroRequestModal({
  open,
  onClose,
  candidateUserId,
  candidateFirstName,
}: {
  open: boolean;
  onClose: () => void;
  candidateUserId: string;
  candidateFirstName: string;
}) {
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const utils = api.useUtils();

  const create = api.introRequests.create.useMutation({
    onSuccess: () => {
      void utils.introRequests.pendingFromMyOrg.invalidate({ candidateUserId });
      setMessage("");
      setErrorMsg(null);
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err.message ?? "Couldn't send the request.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request an intro with {candidateFirstName}</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={message}
            maxLength={MAX_MESSAGE}
            onChange={(e) => {
              setErrorMsg(null);
              setMessage(e.target.value);
            }}
            placeholder="Add a short note — what's the role, what caught your eye? (optional)"
            rows={5}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid var(--v2-border)",
              fontFamily: "inherit",
              fontSize: 14,
              resize: "vertical",
              minHeight: 100,
            }}
          />
          <div style={{ fontSize: 12, color: "var(--v2-ink-700)", textAlign: "right" }}>
            {message.length} / {MAX_MESSAGE}
          </div>
          {errorMsg && (
            <div style={{ color: "#b91c1c", fontSize: 13 }} role="alert">
              {errorMsg}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              create.mutate({
                candidateUserId,
                message: message.trim() || undefined,
              })
            }
            disabled={create.isPending}
          >
            {create.isPending ? "Sending…" : "Send intro request"}{" "}
            <Icon name="arrowRight" size={14} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
