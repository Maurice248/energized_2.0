"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SuggestionCombobox } from "@/components/shared/suggestion-combobox";
import { api } from "@/lib/trpc/client";

const CERT_TYPES = [
  { value: "h2s_alive", label: "H2S Alive" },
  { value: "first_aid", label: "First Aid / CPR" },
  { value: "csts", label: "CSTS-2020" },
  { value: "red_seal", label: "Red Seal" },
  { value: "p_eng", label: "P.Eng" },
  { value: "nace", label: "NACE" },
  { value: "fall_protection", label: "Fall Protection" },
  { value: "other", label: "Other" },
] as const;

type CertType = (typeof CERT_TYPES)[number]["value"];

export type CertDialogInitial = {
  id: string;
  type: CertType;
  name: string;
  issuer: string | null;
  credentialId: string | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  documentUrl: string | null;
};

export type CertDialogPrefill = {
  type?: CertType;
  name?: string;
};

export function AddCertDialog({
  open,
  onOpenChange,
  onCreated,
  initial,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  initial?: CertDialogInitial;
  prefill?: CertDialogPrefill;
}) {
  const editing = Boolean(initial);
  const add = api.profile.addCertification.useMutation({
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
    },
  });
  const update = api.profile.updateCertification.useMutation({
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
    },
  });

  const [type, setType] = useState<CertType>(
    initial?.type ?? prefill?.type ?? "h2s_alive",
  );
  const [name, setName] = useState(initial?.name ?? prefill?.name ?? "");
  const [issuer, setIssuer] = useState(initial?.issuer ?? "");
  const [credentialId, setCredentialId] = useState(initial?.credentialId ?? "");
  const [issuedAt, setIssuedAt] = useState(
    initial?.issuedAt ? toDateInput(initial.issuedAt) : "",
  );
  const [expiresAt, setExpiresAt] = useState(
    initial?.expiresAt ? toDateInput(initial.expiresAt) : "",
  );
  const [noExpiry, setNoExpiry] = useState(
    initial ? initial.expiresAt === null : false,
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const patch = {
      type,
      name: name.trim(),
      issuer: issuer.trim() || null,
      credentialId: credentialId.trim() || null,
      issuedAt: issuedAt ? new Date(issuedAt) : null,
      expiresAt: !noExpiry && expiresAt ? new Date(expiresAt) : null,
      documentUrl: initial?.documentUrl ?? null,
    };
    if (initial) {
      update.mutate({ id: initial.id, patch });
    } else {
      add.mutate(patch);
    }
  };

  const mutation = editing ? update : add;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="v2 sm:max-w-lg bg-white p-6">
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "var(--v2-font-serif)",
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: "-0.015em",
            }}
          >
            {editing ? "Edit certification" : "Add a certification"}
          </DialogTitle>
          <DialogDescription>
            Tickets, safety cards, and credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <SuggestionCombobox
            label="Type"
            value={type}
            onChange={(v) => setType(v as CertType)}
            suggestions={CERT_TYPES}
            pickPlaceholder="Pick a certification type"
            customPlaceholder=""
            otherLabel=""
            allowOther={false}
          />

          <div className="ob-field">
            <label>Name</label>
            <input
              className="v2-input-block"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. H2S Alive"
              required
            />
          </div>

          <div className="ob-grid">
            <div className="ob-field">
              <label>Issuer</label>
              <input
                className="v2-input-block"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="Enform / Energy Safety Canada"
              />
            </div>
            <div className="ob-field">
              <label>Credential ID</label>
              <input
                className="v2-input-block"
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="ob-field">
              <label>Issued</label>
              <input
                className="v2-input-block"
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
              />
            </div>
            <div className="ob-field">
              <label>Expires</label>
              <input
                className="v2-input-block"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={noExpiry}
              />
            </div>
          </div>

          <div
            className="ob-field"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <input
              id="noexpiry"
              type="checkbox"
              checked={noExpiry}
              onChange={(e) => {
                setNoExpiry(e.target.checked);
                if (e.target.checked) setExpiresAt("");
              }}
            />
            <label htmlFor="noexpiry" style={{ margin: 0, cursor: "pointer" }}>
              No expiry date
            </label>
          </div>

          {mutation.error && (
            <div
              style={{
                padding: "10px 14px",
                background: "var(--v2-coral-soft)",
                color: "#A63A20",
                borderRadius: "var(--v2-r-md)",
                fontSize: 13,
              }}
            >
              {mutation.error.message}
            </div>
          )}

          <div
            style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
          >
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="v2-btn v2-btn-primary v2-btn-sm"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? "Saving…"
                : editing
                ? "Save changes"
                : "Add certification"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
