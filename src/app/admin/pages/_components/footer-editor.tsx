"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/trpc/client";
import {
  DEFAULT_SITE_FOOTER,
  footerSocialLabel,
  newFooterId,
  type FooterColumn,
  type FooterLink,
  type FooterSocialLink,
  type SiteFooterContent,
} from "@/lib/site-footer";
import { FooterSocialIcon } from "@/components/shared/footer-social-icon";
import { AddSocialDialog } from "./add-social-dialog";

function moveItem<T extends { order: number }>(items: T[], index: number, dir: -1 | 1): T[] {
  const nextIndex = index + dir;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const current = next[index];
  const swap = next[nextIndex];
  if (!current || !swap) return items;
  next[index] = swap;
  next[nextIndex] = current;
  return next.map((item, order) => ({ ...item, order }));
}

export function FooterEditor() {
  const q = api.admin.pages.getFooter.useQuery();

  if (q.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-sm text-[var(--v2-ink-500)]">
        Loading footer…
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="p-6 text-sm text-red-600">{q.error.message}</div>
    );
  }

  return <FooterEditorForm initial={q.data ?? DEFAULT_SITE_FOOTER} />;
}

function FooterEditorForm({ initial }: { initial: SiteFooterContent }) {
  const utils = api.useUtils();
  const [form, setForm] = useState<SiteFooterContent>(initial);
  const [socialOpen, setSocialOpen] = useState(false);

  const updateMut = api.admin.pages.updateFooter.useMutation({
    onSuccess: async (saved) => {
      setForm(saved);
      toast.success("Footer saved.");
      await utils.admin.pages.getFooter.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const canSave = useMemo(() => {
    if (!form.tagline.trim() || !form.copyrightName.trim()) return false;
    if (form.columns.length === 0) return false;
    return form.columns.every(
      (col) => col.title.trim().length > 0 && col.links.every((l) => l.label.trim() && l.href.trim()),
    );
  }, [form]);

  return (
    <div className="v2-footer-editor flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--v2-ink-200)] bg-[var(--v2-bg,#fff)] px-6 py-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-black tracking-tight text-[var(--v2-ink-950)]">Footer</h2>
          <p className="mt-1 text-sm text-[var(--v2-ink-500)]">
            Site-wide links and social icons shown at the bottom of public pages.
          </p>
        </div>
        <button
          type="button"
          disabled={!canSave || updateMut.isPending}
          onClick={() => updateMut.mutate(form)}
          className="v2-admin-users-add-btn inline-flex h-10 shrink-0 items-center gap-2 rounded-xl !px-6 text-sm font-bold shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden />
          {updateMut.isPending ? "Saving…" : "Save footer"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">

      <section className="mb-8">
        <h3 className="mb-3 text-base font-black text-[var(--v2-ink-950)]">Brand</h3>
        <div className="v2-admin-users-field">
          <label htmlFor="footer-tagline">Tagline</label>
          <textarea
            id="footer-tagline"
            rows={3}
            value={form.tagline}
            onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
          />
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-[var(--v2-ink-950)]">Social icons</h3>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-bold text-[var(--v2-accent-deep)]"
            disabled={form.social.length >= 16}
            onClick={() => setSocialOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add icon
          </button>
        </div>
        <div className="space-y-3">
          {form.social.map((item, index) => (
            <SocialRow
              key={item.id}
              item={item}
              canUp={index > 0}
              canDown={index < form.social.length - 1}
              onChange={(next) =>
                setForm((f) => ({
                  ...f,
                  social: f.social.map((s) => (s.id === item.id ? next : s)),
                }))
              }
              onMove={(dir) =>
                setForm((f) => ({ ...f, social: moveItem(f.social, index, dir) }))
              }
              onRemove={() =>
                setForm((f) => ({
                  ...f,
                  social: f.social.filter((s) => s.id !== item.id).map((s, order) => ({ ...s, order })),
                }))
              }
            />
          ))}
          {form.social.length === 0 ? (
            <p className="text-xs text-[var(--v2-ink-400)]">No social icons. Add one to show them in the footer.</p>
          ) : null}
        </div>
        <AddSocialDialog
          key={socialOpen ? "open" : "closed"}
          open={socialOpen}
          onOpenChange={setSocialOpen}
          onAdd={(draft) =>
            setForm((f) => ({
              ...f,
              social: [
                ...f.social,
                {
                  id: newFooterId("social"),
                  name: draft.name,
                  href: draft.href,
                  icon: draft.icon,
                  order: f.social.length,
                },
              ],
            }))
          }
        />
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-[var(--v2-ink-950)]">Link columns</h3>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-bold text-[var(--v2-accent-deep)]"
            disabled={form.columns.length >= 4}
            onClick={() =>
              setForm((f) => ({
                ...f,
                columns: [
                  ...f.columns,
                  {
                    id: newFooterId("col"),
                    title: "New column",
                    order: f.columns.length,
                    links: [
                      {
                        id: newFooterId("link"),
                        label: "New link",
                        href: "/",
                        order: 0,
                      },
                    ],
                  },
                ],
              }))
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add column
          </button>
        </div>
        <div className="space-y-4">
          {form.columns.map((column, index) => (
            <ColumnCard
              key={column.id}
              column={column}
              canRemove={form.columns.length > 1}
              canUp={index > 0}
              canDown={index < form.columns.length - 1}
              onChange={(next) =>
                setForm((f) => ({
                  ...f,
                  columns: f.columns.map((c) => (c.id === column.id ? next : c)),
                }))
              }
              onMove={(dir) =>
                setForm((f) => ({ ...f, columns: moveItem(f.columns, index, dir) }))
              }
              onRemove={() =>
                setForm((f) => ({
                  ...f,
                  columns: f.columns
                    .filter((c) => c.id !== column.id)
                    .map((c, order) => ({ ...c, order })),
                }))
              }
            />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h3 className="mb-3 text-base font-black text-[var(--v2-ink-950)]">Wordmark</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="v2-admin-users-field">
            <label htmlFor="footer-wm-before">Before accent</label>
            <input
              id="footer-wm-before"
              value={form.wordmarkBefore}
              onChange={(e) => setForm((f) => ({ ...f, wordmarkBefore: e.target.value }))}
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="footer-wm-accent">Accent</label>
            <input
              id="footer-wm-accent"
              value={form.wordmarkAccent}
              onChange={(e) => setForm((f) => ({ ...f, wordmarkAccent: e.target.value }))}
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="footer-wm-after">After accent</label>
            <input
              id="footer-wm-after"
              value={form.wordmarkAfter}
              onChange={(e) => setForm((f) => ({ ...f, wordmarkAfter: e.target.value }))}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--v2-ink-400)]">
          Preview: {form.wordmarkBefore}
          <em className="text-[var(--v2-accent-deep)]">{form.wordmarkAccent}</em>
          {form.wordmarkAfter}
        </p>
      </section>

      <section>
        <h3 className="mb-3 text-base font-black text-[var(--v2-ink-950)]">Bottom bar</h3>
        <div className="v2-admin-users-field mb-4">
          <label htmlFor="footer-copyright">Copyright name</label>
          <input
            id="footer-copyright"
            value={form.copyrightName}
            onChange={(e) => setForm((f) => ({ ...f, copyrightName: e.target.value }))}
          />
        </div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-[var(--v2-ink-800)]">Legal links</h4>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-bold text-[var(--v2-accent-deep)]"
            disabled={form.legalLinks.length >= 8}
            onClick={() =>
              setForm((f) => ({
                ...f,
                legalLinks: [
                  ...f.legalLinks,
                  { id: newFooterId("legal"), label: "New link", href: "/", order: f.legalLinks.length },
                ],
              }))
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add link
          </button>
        </div>
        <div className="space-y-3">
          {form.legalLinks.map((link, index) => (
            <LinkRow
              key={link.id}
              link={link}
              canUp={index > 0}
              canDown={index < form.legalLinks.length - 1}
              onChange={(next) =>
                setForm((f) => ({
                  ...f,
                  legalLinks: f.legalLinks.map((l) => (l.id === link.id ? next : l)),
                }))
              }
              onMove={(dir) =>
                setForm((f) => ({ ...f, legalLinks: moveItem(f.legalLinks, index, dir) }))
              }
              onRemove={() =>
                setForm((f) => ({
                  ...f,
                  legalLinks: f.legalLinks
                    .filter((l) => l.id !== link.id)
                    .map((l, order) => ({ ...l, order })),
                }))
              }
            />
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}

function SocialRow({
  item,
  canUp,
  canDown,
  onChange,
  onMove,
  onRemove,
}: {
  item: FooterSocialLink;
  canUp: boolean;
  canDown: boolean;
  onChange: (next: FooterSocialLink) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--v2-ink-200)] p-3">
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
        <span
          className="flex h-9 w-full items-center justify-start gap-2 rounded-lg bg-[var(--v2-ink-100)] px-2.5 text-[var(--v2-ink-800)]"
          title={footerSocialLabel(item.icon)}
        >
          <FooterSocialIcon name={item.icon} size={16} />
          <span className="min-w-0 truncate text-xs font-bold">
            {footerSocialLabel(item.icon)}
          </span>
        </span>
        <input
          aria-label="Social name"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          placeholder="Name"
        />
        <input
          aria-label="Social URL"
          value={item.href}
          onChange={(e) => onChange({ ...item, href: e.target.value })}
          placeholder="https://"
        />
        <RowActions canUp={canUp} canDown={canDown} onMove={onMove} onRemove={onRemove} />
      </div>
    </div>
  );
}

function ColumnCard({
  column,
  canRemove,
  canUp,
  canDown,
  onChange,
  onMove,
  onRemove,
}: {
  column: FooterColumn;
  canRemove: boolean;
  canUp: boolean;
  canDown: boolean;
  onChange: (next: FooterColumn) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--v2-ink-200)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <input
          className="min-w-0 flex-1 font-bold"
          aria-label="Column title"
          value={column.title}
          onChange={(e) => onChange({ ...column, title: e.target.value })}
        />
        <RowActions
          canUp={canUp}
          canDown={canDown}
          onMove={onMove}
          onRemove={canRemove ? onRemove : undefined}
        />
      </div>
      <div className="space-y-2">
        {column.links.map((link, index) => (
          <LinkRow
            key={link.id}
            link={link}
            canUp={index > 0}
            canDown={index < column.links.length - 1}
            onChange={(next) =>
              onChange({
                ...column,
                links: column.links.map((l) => (l.id === link.id ? next : l)),
              })
            }
            onMove={(dir) =>
              onChange({ ...column, links: moveItem(column.links, index, dir) })
            }
            onRemove={() =>
              onChange({
                ...column,
                links: column.links
                  .filter((l) => l.id !== link.id)
                  .map((l, order) => ({ ...l, order })),
              })
            }
          />
        ))}
      </div>
      <button
        type="button"
        className="mt-3 flex items-center gap-1 text-xs font-bold text-[var(--v2-accent-deep)]"
        disabled={column.links.length >= 12}
        onClick={() =>
          onChange({
            ...column,
            links: [
              ...column.links,
              { id: newFooterId("link"), label: "New link", href: "/", order: column.links.length },
            ],
          })
        }
      >
        <Plus className="h-3.5 w-3.5" />
        Add link
      </button>
    </div>
  );
}

function LinkRow({
  link,
  canUp,
  canDown,
  onChange,
  onMove,
  onRemove,
}: {
  link: FooterLink;
  canUp: boolean;
  canDown: boolean;
  onChange: (next: FooterLink) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <input
        aria-label="Link label"
        value={link.label}
        onChange={(e) => onChange({ ...link, label: e.target.value })}
        placeholder="Label"
      />
      <input
        aria-label="Link URL"
        value={link.href}
        onChange={(e) => onChange({ ...link, href: e.target.value })}
        placeholder="/page or https://"
      />
      <RowActions canUp={canUp} canDown={canDown} onMove={onMove} onRemove={onRemove} />
    </div>
  );
}

function RowActions({
  canUp,
  canDown,
  onMove,
  onRemove,
}: {
  canUp: boolean;
  canDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-end">
      <button type="button" className="rounded-lg p-1.5 text-[var(--v2-ink-400)] hover:bg-[var(--v2-ink-100)]" disabled={!canUp} onClick={() => onMove(-1)} title="Move up">
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" className="rounded-lg p-1.5 text-[var(--v2-ink-400)] hover:bg-[var(--v2-ink-100)]" disabled={!canDown} onClick={() => onMove(1)} title="Move down">
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      {onRemove ? (
        <button type="button" className="rounded-lg p-1.5 text-[var(--v2-ink-400)] hover:bg-[var(--v2-coral-soft)] hover:text-[var(--v2-coral)]" onClick={onRemove} title="Remove">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
