"use client";

import { useState } from "react";
import { Edit, Mail } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactEmailCard() {
  const utils = api.useUtils();
  const { data, isLoading } = api.admin.pages.getContactEmail.useQuery();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const savedEmail = data?.email ?? "";

  function openEditor() {
    setDraft(savedEmail);
    setOpen(true);
  }

  const updateMut = api.admin.pages.updateContactEmail.useMutation({
    onSuccess: async (res) => {
      toast.success("Contact email saved.");
      setOpen(false);
      await Promise.all([
        utils.admin.pages.getContactEmail.invalidate(),
        utils.admin.settings.get.invalidate(),
      ]);
      setDraft(res.email);
    },
    onError: (e) => toast.error(e.message),
  });

  const trimmed = draft.trim();
  const emailError =
    trimmed.length === 0
      ? "Email is required."
      : EMAIL_RX.test(trimmed)
        ? null
        : "Enter a valid email address.";
  const saveDisabled =
    updateMut.isPending || emailError !== null || trimmed === savedEmail;

  return (
    <>
      <div className="mb-6 rounded-2xl border border-[var(--v2-ink-200)] bg-[var(--v2-bg,#fff)] p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--v2-ink-100)] text-[var(--v2-ink-700)]">
            <Mail className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h4 className="text-[15px] font-bold tracking-tight text-[var(--v2-ink-950)]">
                Public contact email
              </h4>
              <span className="inline-flex items-center rounded-md border border-[var(--v2-ink-200)] bg-[var(--v2-ink-100)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--v2-ink-600)]">
                Inbox
              </span>
            </div>
            <p
              className="truncate text-sm font-semibold text-[var(--v2-ink-900)]"
              style={{ fontFamily: "var(--v2-font-mono, ui-monospace)" }}
            >
              {isLoading ? "Loading…" : savedEmail || "—"}
            </p>
            <p className="mt-1 text-xs font-medium text-[var(--v2-ink-400)]">
              Shown on the /contact email card and used as the form destination.
            </p>
          </div>
          <button
            type="button"
            onClick={openEditor}
            className="rounded-xl p-2 text-[var(--v2-ink-400)] transition-colors hover:bg-[var(--v2-sand)] hover:text-[var(--v2-ink-950)]"
            title="Edit contact email"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) setDraft(savedEmail);
          setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Public contact email</DialogTitle>
            <DialogDescription>
              Updates the email card on /contact and where contact-form messages
              are sent.
            </DialogDescription>
          </DialogHeader>
          <div className="v2-admin-users-field">
            <label htmlFor="admin-contact-email">Email address</label>
            <input
              id="admin-contact-email"
              type="email"
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="hello@energized.biz"
            />
            {emailError ? (
              <div
                className="text-xs"
                style={{ marginTop: 4, color: "var(--v2-danger, #b91c1c)" }}
              >
                {emailError}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saveDisabled}
              onClick={() => updateMut.mutate({ email: trimmed })}
            >
              {updateMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
