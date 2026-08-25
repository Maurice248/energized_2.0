"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { inferRouterOutputs } from "@trpc/server";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ExternalLink,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/lib/trpc/client";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KpiCard } from "@/app/admin/_components/kpi-card";
import { SectionCard } from "@/app/admin/_components/section-card";
import { SortableSectionRow } from "@/app/admin/pages/_components/sortable-section-row";
import { sanitizeCmsHtml } from "@/lib/sanitize-cms-html";
import { cn } from "@/lib/utils";

type FaqRow = inferRouterOutputs<AppRouter>["admin"]["faqs"]["list"][number];
type FaqCategory = FaqRow["category"];
type FaqStatus = FaqRow["status"];
type AnswerFormat = FaqRow["answerFormat"];

type CategoryFilter = "all" | FaqCategory;
type StatusFilter = "all" | FaqStatus;

type EditorMode = "create" | "edit" | "delete" | null;

const CATEGORY_LABEL: Record<FaqCategory, string> = {
  general: "General",
  seekers: "Job seekers",
  employers: "Employers",
  billing: "Billing & plans",
  privacy: "Privacy & data",
};

const CATEGORY_ORDER: FaqCategory[] = [
  "general",
  "seekers",
  "employers",
  "billing",
  "privacy",
];

function categoryBadgeClass(cat: FaqCategory): string {
  switch (cat) {
    case "seekers":
      return "border-transparent bg-[var(--v2-accent-soft)] text-[var(--v2-ink-800)]";
    case "employers":
      return "border-transparent bg-[var(--v2-ink-950)] text-[var(--v2-accent)]";
    case "billing":
      return "border-transparent bg-[var(--v2-coral-soft)] text-[#A63A20]";
    case "privacy":
      return "border-transparent bg-[#E8E3FF] text-[#4C3D9E]";
    default:
      return "border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] text-[var(--v2-ink-800)]";
  }
}

function snippet(text: string, max = 140): string {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function AdminFaqsClient() {
  const utils = api.useUtils();

  const [searchDraft, setSearchDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [activeRow, setActiveRow] = useState<FaqRow | null>(null);

  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [formFormat, setFormFormat] = useState<AnswerFormat>("markdown");
  const [formCategory, setFormCategory] = useState<FaqCategory>("general");
  const [formStatus, setFormStatus] = useState<FaqStatus>("draft");
  const [formSupportUrl, setFormSupportUrl] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchDraft.trim()), 320);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const listInput = useMemo(() => {
    const o: {
      search?: string;
      status?: StatusFilter;
      category?: FaqCategory | "all";
    } = {};
    if (debouncedSearch) o.search = debouncedSearch;
    if (statusFilter !== "all") o.status = statusFilter;
    if (categoryFilter !== "all") o.category = categoryFilter;
    return Object.keys(o).length ? o : {};
  }, [debouncedSearch, statusFilter, categoryFilter]);

  const { data, isLoading, isError, error } = api.admin.faqs.list.useQuery(listInput);
  const { data: stats, isLoading: statsLoading } = api.admin.faqs.stats.useQuery();

  const invalidateAll = useCallback(async () => {
    await Promise.all([
      utils.admin.faqs.list.invalidate(),
      utils.admin.faqs.stats.invalidate(),
    ]);
  }, [utils.admin.faqs.list, utils.admin.faqs.stats]);

  const createMut = api.admin.faqs.create.useMutation({
    onSuccess: async () => {
      toast.success("FAQ created.");
      await invalidateAll();
      closeEditor();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = api.admin.faqs.update.useMutation({
    onSuccess: async () => {
      toast.success("FAQ saved.");
      await invalidateAll();
      closeEditor();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = api.admin.faqs.delete.useMutation({
    onSuccess: async () => {
      toast.success("FAQ removed.");
      await invalidateAll();
      closeEditor();
    },
    onError: (e) => toast.error(e.message),
  });

  const reorderMut = api.admin.faqs.reorder.useMutation({
    onSuccess: async () => {
      toast.success("Order updated.");
      await invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });

  const seedMut = api.admin.faqs.seedDefaults.useMutation({
    onSuccess: async (res) => {
      if (res.inserted === 0) {
        toast.info("Starter FAQs were already seeded.");
      } else {
        toast.success(
          `Seeded ${res.inserted} FAQ${res.inserted === 1 ? "" : "s"}.`,
        );
      }
      await invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });

  const rows = data ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const canReorder =
    categoryFilter !== "all" && rows.length > 1 && !reorderMut.isPending;

  function closeEditor() {
    setEditorMode(null);
    setActiveRow(null);
    setFormQuestion("");
    setFormAnswer("");
    setFormFormat("markdown");
    setFormCategory("general");
    setFormStatus("draft");
    setFormSupportUrl("");
    setShowPreview(false);
  }

  function openCreate() {
    setActiveRow(null);
    setFormQuestion("");
    setFormAnswer("");
    setFormFormat("markdown");
    setFormCategory(categoryFilter === "all" ? "general" : categoryFilter);
    setFormStatus("draft");
    setFormSupportUrl("");
    setShowPreview(false);
    setEditorMode("create");
  }

  function openEdit(row: FaqRow) {
    setActiveRow(row);
    setFormQuestion(row.question);
    setFormAnswer(row.answer);
    setFormFormat(row.answerFormat);
    setFormCategory(row.category);
    setFormStatus(row.status);
    setFormSupportUrl(row.supportArticleUrl ?? "");
    setShowPreview(false);
    setEditorMode("edit");
  }

  function openDelete(row: FaqRow) {
    setActiveRow(row);
    setEditorMode("delete");
  }

  function onDragEnd(event: DragEndEvent) {
    if (categoryFilter === "all") return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(rows, oldIndex, newIndex);
    reorderMut.mutate({
      category: categoryFilter,
      orderedIds: next.map((r) => r.id),
    });
  }

  const saveDisabled =
    formQuestion.trim().length === 0 ||
    createMut.isPending ||
    updateMut.isPending;

  function submitSave() {
    const q = formQuestion.trim();
    const support =
      formSupportUrl.trim() === "" ? null : formSupportUrl.trim();
    if (editorMode === "create") {
      createMut.mutate({
        category: formCategory,
        question: q,
        answer: formAnswer,
        answerFormat: formFormat,
        supportArticleUrl: support,
        status: formStatus,
      });
      return;
    }
    if (editorMode === "edit" && activeRow) {
      updateMut.mutate({
        id: activeRow.id,
        category: formCategory,
        question: q,
        answer: formAnswer,
        answerFormat: formFormat,
        supportArticleUrl: support,
        status: formStatus,
      });
    }
  }

  function confirmDelete() {
    if (!activeRow) return;
    deleteMut.mutate({ id: activeRow.id });
  }

  const dialogOpen = editorMode === "create" || editorMode === "edit";

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="v2-ahead" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <div className="v2-atop-crumb">
            Manage · <strong>Content</strong>
          </div>
          <h1>
            FAQ <em>library.</em>
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            Curate answers for marketing and in-app help: group by audience, publish when ready, link out to deeper articles, and reorder within each category without redeploying.
          </p>
        </div>
      </div>

      <div className="v2-akpi-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <KpiCard
          eyebrow="Total entries"
          icon="fileText"
          value={statsLoading ? "—" : stats?.total ?? 0}
          note="All categories"
        />
        <KpiCard
          eyebrow="Published"
          icon="checkCircle"
          value={statsLoading ? "—" : stats?.published ?? 0}
          note="Live on /faqs"
        />
        <KpiCard
          eyebrow="Drafts"
          icon="circle"
          value={statsLoading ? "—" : stats?.drafts ?? 0}
          note="Hidden until published"
        />
      </div>

      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[var(--v2-accent-deep)]" aria-hidden />
            Questions & answers
          </span>
        }
        action={
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--v2-ink-500)]">
            {rows.length} shown
          </span>
        }
      >
        <div className="space-y-5 px-1 pb-2 pt-1">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--v2-ink-500)]">
                Category
              </p>
              <div className="v2-ahead-range w-fit flex-wrap">
                <button
                  type="button"
                  className={cn(categoryFilter === "all" && "active")}
                  onClick={() => setCategoryFilter("all")}
                >
                  All
                </button>
                {CATEGORY_ORDER.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(categoryFilter === c && "active")}
                    onClick={() => setCategoryFilter(c)}
                  >
                    {CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--v2-ink-500)]">
                  Status
                </p>
                <div className="v2-ahead-range">
                  {(["all", "published", "draft"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={cn(statusFilter === s && "active")}
                      onClick={() => setStatusFilter(s)}
                    >
                      {s === "all" ? "All" : s === "published" ? "Published" : "Draft"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3 lg:max-w-xl">
                <div className="min-w-[200px] flex-1 space-y-2">
                  <Label
                    htmlFor="faq-search"
                    className="text-xs font-bold uppercase tracking-wider text-[var(--v2-ink-500)]"
                  >
                    Search
                  </Label>
                  <Input
                    id="faq-search"
                    placeholder="Question or answer…"
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    className="h-10 rounded-xl border-[var(--v2-ink-200)]"
                  />
                </div>
                {stats && stats.total === 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 rounded-xl"
                    disabled={seedMut.isPending}
                    onClick={() => seedMut.mutate()}
                  >
                    {seedMut.isPending ? "Seeding…" : "Seed starter FAQs"}
                  </Button>
                ) : null}
                <button
                  type="button"
                  className="v2-btn v2-btn-primary v2-admin-faq-new-btn shrink-0"
                  onClick={openCreate}
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  New FAQ
                </button>
              </div>
            </div>
          </div>

          {categoryFilter === "all" ? (
            <p className="rounded-xl border border-dashed border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-4 py-3 text-sm text-[var(--v2-ink-600)]">
              Select a <strong className="text-[var(--v2-ink-900)]">category</strong>{" "}
              to drag-and-drop reorder. While viewing &quot;All&quot;, entries follow fixed
              category order then manual rank.
            </p>
          ) : (
            <p className="text-sm text-[var(--v2-ink-600)]">
              Drag the grip handle to change display order within{" "}
              <strong className="text-[var(--v2-ink-900)]">
                {CATEGORY_LABEL[categoryFilter]}
              </strong>
              .
            </p>
          )}

          {isError ? (
            <p className="text-sm text-red-600" role="alert">
              {error.message}
            </p>
          ) : null}

          {isLoading ? (
            <p className="text-sm text-[var(--v2-ink-500)]">Loading FAQs…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-[var(--v2-ink-600)]">
              No FAQs match these filters yet.{" "}
              {stats?.total === 0 ? (
                <>
                  <button
                    type="button"
                    className="font-semibold text-[var(--v2-accent-deep)] underline-offset-2 hover:underline"
                    disabled={seedMut.isPending}
                    onClick={() => seedMut.mutate()}
                  >
                    Seed starter FAQs
                  </button>
                  {" or "}
                </>
              ) : null}
              <button
                type="button"
                className="font-semibold text-[var(--v2-accent-deep)] underline-offset-2 hover:underline"
                onClick={openCreate}
              >
                create one
              </button>
              .
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={rows.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
                disabled={!canReorder}
              >
                <ul className="space-y-3">
                  {rows.map((row) => (
                    <SortableSectionRow key={row.id} id={row.id}>
                      {({ attributes, listeners }) => (
                        <li className="v2-acard !border-[var(--v2-ink-200)] !shadow-none">
                          <div className="flex flex-wrap items-start gap-3 p-4 sm:flex-nowrap">
                            <button
                              type="button"
                              className={cn(
                                "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-[var(--v2-ink-400)] hover:border-[var(--v2-ink-200)] hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-800)]",
                                !canReorder && "cursor-not-allowed opacity-40 hover:bg-transparent",
                              )}
                              disabled={!canReorder}
                              aria-label="Drag to reorder"
                              {...attributes}
                              {...listeners}
                            >
                              <GripVertical className="h-5 w-5" />
                            </button>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                                    categoryBadgeClass(row.category),
                                  )}
                                >
                                  {CATEGORY_LABEL[row.category]}
                                </Badge>
                                <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[var(--v2-ink-500)]">
                                  {row.status === "published" ? (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                      Published
                                    </>
                                  ) : (
                                    <>
                                      <Circle className="h-3.5 w-3.5 text-[var(--v2-ink-400)]" />
                                      Draft
                                    </>
                                  )}
                                </span>
                                <span className="text-xs font-mono text-[var(--v2-ink-400)]">
                                  #{row.sortOrder + 1}
                                </span>
                              </div>
                              <h3 className="text-base font-bold leading-snug text-[var(--v2-ink-950)]">
                                {row.question}
                              </h3>
                              <p className="text-sm text-[var(--v2-ink-600)]">
                                {snippet(
                                  row.answerFormat === "html"
                                    ? row.answer.replace(/<[^>]+>/g, " ")
                                    : row.answer,
                                )}
                              </p>
                              {row.supportArticleUrl ? (
                                <a
                                  href={row.supportArticleUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--v2-accent-deep)] hover:underline"
                                >
                                  Support article
                                  <ExternalLink className="h-3 w-3" aria-hidden />
                                </a>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 gap-2 self-start">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="rounded-xl border-[var(--v2-ink-200)]"
                                aria-label={`Edit FAQ: ${row.question}`}
                                onClick={() => openEdit(row)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="rounded-xl border-[var(--v2-ink-200)] text-red-600 hover:bg-red-50"
                                aria-label={`Delete FAQ: ${row.question}`}
                                onClick={() => openDelete(row)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </li>
                      )}
                    </SortableSectionRow>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </SectionCard>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl border-[var(--v2-ink-200)] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editorMode === "create" ? "New FAQ" : "Edit FAQ"}</DialogTitle>
            <DialogDescription>
              Answers support Markdown or sanitized HTML (same pipeline as marketing CMS pages).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="faq-q">Question</Label>
              <Input
                id="faq-q"
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="e.g. How do rotations appear on my profile?"
                className="rounded-xl"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="faq-cat">Category</Label>
                <select
                  id="faq-cat"
                  className="flex h-10 w-full rounded-xl border border-[var(--v2-ink-200)] bg-white px-3 text-sm font-medium text-[var(--v2-ink-950)]"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as FaqCategory)}
                >
                  {CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="faq-status">Status</Label>
                <select
                  id="faq-status"
                  className="flex h-10 w-full rounded-xl border border-[var(--v2-ink-200)] bg-white px-3 text-sm font-medium text-[var(--v2-ink-950)]"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as FaqStatus)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="faq-format">Answer format</Label>
              <select
                id="faq-format"
                className="flex h-10 w-full rounded-xl border border-[var(--v2-ink-200)] bg-white px-3 text-sm font-medium text-[var(--v2-ink-950)]"
                value={formFormat}
                onChange={(e) => setFormFormat(e.target.value as AnswerFormat)}
              >
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
              </select>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="faq-a">Answer</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full text-xs font-semibold"
                  onClick={() => setShowPreview((v) => !v)}
                >
                  {showPreview ? "Edit" : "Preview"}
                </Button>
              </div>
              {showPreview ? (
                <div className="v2-prose max-h-[280px] max-w-none overflow-y-auto rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-bg,#fff)] p-4 text-sm">
                  {formFormat === "markdown" ? (
                    formAnswer.trim() ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{formAnswer}</ReactMarkdown>
                    ) : (
                      <span className="text-[var(--v2-ink-500)]">Nothing to preview.</span>
                    )
                  ) : (
                    <div
                      dangerouslySetInnerHTML={{
                        __html:
                          formAnswer.trim().length === 0
                            ? '<p style="opacity:.6">Nothing to preview.</p>'
                            : sanitizeCmsHtml(formAnswer),
                      }}
                    />
                  )}
                </div>
              ) : (
                <textarea
                  id="faq-a"
                  value={formAnswer}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setFormAnswer(e.target.value)
                  }
                  rows={10}
                  placeholder="Short, grounded answer. Use Markdown lists for steps."
                  className={cn(
                    "flex min-h-[200px] w-full rounded-xl border border-[var(--v2-ink-200)] bg-white px-3 py-2 font-mono text-sm text-[var(--v2-ink-950)] outline-none transition-colors",
                    "placeholder:text-muted-foreground focus-visible:border-[var(--v2-accent)] focus-visible:ring-2 focus-visible:ring-[var(--v2-accent-soft)]",
                  )}
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="faq-url">Support article URL (optional)</Label>
              <Input
                id="faq-url"
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={formSupportUrl}
                onChange={(e) => setFormSupportUrl(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-full" onClick={closeEditor}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[var(--v2-ink-950)]"
              disabled={saveDisabled}
              onClick={submitSave}
            >
              {editorMode === "create" ? "Create FAQ" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editorMode === "delete"}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-[var(--v2-ink-200)]">
          <DialogHeader>
            <DialogTitle>Delete FAQ</DialogTitle>
            <DialogDescription>
              This removes the entry from the library. Surfaces that already cached content may need a refresh.
            </DialogDescription>
          </DialogHeader>
          {activeRow ? (
            <p className="text-sm font-medium text-[var(--v2-ink-900)]">
              {activeRow.question}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-full" onClick={closeEditor}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              disabled={deleteMut.isPending}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
