"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FooterSocialIcon } from "@/components/shared/footer-social-icon";
import {
  FOOTER_SOCIAL_ICONS,
  footerSocialDefaultHref,
  footerSocialLabel,
  type FooterSocialIcon as FooterSocialIconId,
} from "@/lib/site-footer";
import { cn } from "@/lib/utils";

type Draft = {
  icon: FooterSocialIconId;
  name: string;
  href: string;
};

export function AddSocialDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (draft: Draft) => void;
}) {
  const [icon, setIcon] = useState<FooterSocialIconId>("linkedin");
  const [name, setName] = useState(footerSocialLabel("linkedin"));
  const [href, setHref] = useState(footerSocialDefaultHref("linkedin"));

  function pick(next: FooterSocialIconId) {
    setIcon(next);
    setName(footerSocialLabel(next));
    setHref(footerSocialDefaultHref(next));
  }

  const canAdd = name.trim().length > 0 && href.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="grid-cols-1 sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Add social icon</DialogTitle>
          <DialogDescription>
            Choose a network, then confirm the label and URL shown in the footer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[min(22rem,45vh)] w-full grid-cols-2 gap-2 overflow-y-auto pr-1">
          {FOOTER_SOCIAL_ICONS.map((id) => {
            const selected = id === icon;
            return (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                className={cn(
                  "flex w-full min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                  selected
                    ? "border-[var(--v2-ink-950)] bg-[var(--v2-ink-950)] text-white"
                    : "border-[var(--v2-ink-200)] bg-white text-[var(--v2-ink-800)] hover:border-[var(--v2-ink-300)] hover:bg-[var(--v2-ink-50)]",
                )}
              >
                <FooterSocialIcon name={id} size={16} />
                <span className={cn("min-w-0", selected && "text-white")}>
                  {footerSocialLabel(id)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid w-full grid-cols-1 gap-3">
          <div className="v2-admin-users-field" style={{ marginTop: 0 }}>
            <label htmlFor="footer-social-name">Label</label>
            <input
              id="footer-social-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="v2-admin-users-field" style={{ marginTop: 0 }}>
            <label htmlFor="footer-social-href">URL</label>
            <input
              id="footer-social-href"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="https://"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-[var(--v2-accent)] px-5 font-bold text-white hover:bg-[var(--v2-accent-deep)]"
            disabled={!canAdd}
            onClick={() => {
              onAdd({ icon, name: name.trim(), href: href.trim() });
              onOpenChange(false);
            }}
          >
            Add icon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
