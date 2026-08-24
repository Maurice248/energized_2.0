"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  Briefcase,
  Building,
  CheckCircle2,
  Circle,
  DollarSign,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  GraduationCap,
  GripVertical,
  Home,
  Phone,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { api } from "@/lib/trpc/client";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KpiCard } from "@/app/admin/_components/kpi-card";
import { CmsRichTextEditor } from "@/components/admin/cms-rich-text-editor";
import { sanitizeCmsHtml } from "@/lib/sanitize-cms-html";
import {
  type CmsPageSectionRecord,
  classifyStoredHtmlBody,
  normalizeSectionOrders,
  parseCmsSectionsFromBody,
  serializeHtmlSectionsToStoredBody,
} from "@/lib/cms-page-sections";
import { cn } from "@/lib/utils";
import {
  SortableSectionRow,
  type SortableDragProps,
} from "./_components/sortable-section-row";

type PageStatus = "draft" | "published";
type CmsBodyFormat = "markdown" | "html";
type StatusFilter = "all" | PageStatus;
type PageDialog = "create" | "edit" | "delete" | null;
type SectionDialog = "add" | "edit" | "view" | "delete" | null;

type PageRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
  bodyFormat: CmsBodyFormat;
  seoTitle: string | null;
  seoDescription: string | null;
  status: PageStatus;
  isSystem: boolean;
  servedByMarketingRoute: boolean;
  updatedAt: Date;
  createdAt: Date;
};

const SLUG_RX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugifyDraft(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function publicPathForSlug(slug: string): string {
  return slug === "home" ? "/" : `/${slug}`;
}

function getPageListLabel(slug: string, title: string): string {
  if (slug === "contact") return "Contact";
  return title;
}

/** Icons for seeded surface slugs plus title heuristics. */
function getPageIcon(slug: string, pageTitle: string) {
  switch (slug) {
    case "home":
      return Home;
    case "jobs":
      return Briefcase;
    case "skills":
      return Sparkles;
    case "trainings":
      return GraduationCap;
    case "contact":
      return Phone;
    default:
      break;
  }
  const title = pageTitle.toLowerCase();
  if (title.includes("about")) return Globe;
  if (title.includes("contact")) return Phone;
  if (title.includes("home")) return Home;
  if (title.includes("privacy")) return Shield;
  if (title.includes("terms")) return Shield;
  if (title.includes("pricing")) return DollarSign;
  if (title.includes("property") || title.includes("properties")) return Building;
  return FileText;
}

function getSectionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    hero: "Hero",
    text: "Text",
    cta: "CTA",
    features: "Features",
    mission: "Mission",
    values: "Values",
    team: "Team",
    contact: "Contact",
  };
  return labels[type] ?? type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function sectionPreviewSnippet(content: string, bodyFormat: CmsBodyFormat, max = 140): string {
  if (!content.trim()) return "";
  let s = content;
  if (bodyFormat === "html") {
    s = content.replace(/<[^>]+>/g, " ");
  }
  s = s.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function AdminBodyPreview({ body, bodyFormat }: { body: string; bodyFormat: CmsBodyFormat }) {
  if (bodyFormat === "markdown") {
    return (
      <div className="v2-prose max-w-none border border-[var(--v2-ink-200)] bg-[var(--v2-bg,#fff)] p-6 text-sm">
        {body.trim().length === 0 ? (
          <span className="text-[var(--v2-ink-500)]">Nothing to preview yet.</span>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        )}
      </div>
    );
  }

  const classified = classifyStoredHtmlBody(body);
  if (classified.kind === "plain") {
    return (
      <div
        className="v2-prose max-w-none border border-[var(--v2-ink-200)] bg-[var(--v2-bg,#fff)] p-6 text-sm"
        dangerouslySetInnerHTML={{
          __html:
            classified.html.trim().length === 0
              ? '<p style="opacity:.6">Nothing to preview yet.</p>'
              : sanitizeCmsHtml(classified.html),
        }}
      />
    );
  }

  return (
    <div className="space-y-8 border border-[var(--v2-ink-200)] bg-[var(--v2-bg,#fff)] p-6">
      {classified.sections.map((s) => (
        <section key={s.id} className="v2-prose max-w-none text-sm">
          {s.title.trim().length > 0 ? (
            <h2 className="mb-3 text-lg font-black tracking-tight text-[var(--v2-ink-950)]">{s.title}</h2>
          ) : null}
          <div
            dangerouslySetInnerHTML={{
              __html:
                s.content.trim().length === 0
                  ? '<p style="opacity:.6">Empty section.</p>'
                  : sanitizeCmsHtml(s.content),
            }}
          />
        </section>
      ))}
    </div>
  );
}

export function AdminPagesClient() {
  const utils = api.useUtils();

  const [searchDraft, setSearchDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchDraft.trim()), 300);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const listInput = useMemo(() => {
    const o: { search?: string; status?: StatusFilter } = {};
    if (debouncedSearch) o.search = debouncedSearch;
    if (statusFilter !== "all") o.status = statusFilter;
    return Object.keys(o).length ? o : {};
  }, [debouncedSearch, statusFilter]);

  const { data, isLoading, isError, error } = api.admin.pages.list.useQuery(listInput);
  const { data: stats, isLoading: statsLoading } = api.admin.pages.stats.useQuery();

  async function invalidateAll() {
    await Promise.all([
      utils.admin.pages.list.invalidate(),
      utils.admin.pages.stats.invalidate(),
    ]);
  }

  const rows: PageRow[] = useMemo(() => data ?? [], [data]);
  const [focusedPageId, setFocusedPageId] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (rows.length === 0) return null;
    if (focusedPageId) {
      const hit = rows.find((r) => r.id === focusedPageId);
      if (hit) return hit;
    }
    return rows[0]!;
  }, [rows, focusedPageId]);

  const [previewMode, setPreviewMode] = useState(false);
  const [pageDialog, setPageDialog] = useState<PageDialog>(null);
  const [sectionDialog, setSectionDialog] = useState<SectionDialog>(null);
  const [activeSection, setActiveSection] = useState<CmsPageSectionRecord | null>(null);

  const [formSlug, setFormSlug] = useState("");
  const [formSlugTouched, setFormSlugTouched] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formSeoTitle, setFormSeoTitle] = useState("");
  const [formSeoDescription, setFormSeoDescription] = useState("");
  const [formStatus, setFormStatus] = useState<PageStatus>("draft");

  const [sectionTitleDraft, setSectionTitleDraft] = useState("");
  const [sectionContentDraft, setSectionContentDraft] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sections = useMemo(() => {
    if (!selected) return [];
    return parseCmsSectionsFromBody(selected.body, selected.bodyFormat, selected.title);
  }, [selected]);

  const canDragSections = selected?.bodyFormat === "html" && sections.length > 1;

  const updateMut = api.admin.pages.update.useMutation({
    onSuccess: async () => {
      await invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });

  const createMut = api.admin.pages.create.useMutation({
    onSuccess: async (row) => {
      toast.success("Page created.");
      await invalidateAll();
      setFocusedPageId(row.id);
      closePageDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = api.admin.pages.delete.useMutation({
    onSuccess: async () => {
      toast.success("Page deleted.");
      await invalidateAll();
      setPageDialog(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const seedMut = api.admin.pages.seedSystemPages.useMutation({
    onSuccess: async (res) => {
      if (res.inserted === 0) {
        toast.info("Marketing pages were already seeded.");
      } else {
        toast.success(
          `Seeded ${res.inserted} marketing page${res.inserted === 1 ? "" : "s"}.`,
        );
      }
      await invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });

  const hasSeededRows = useMemo(() => rows.some((r) => r.isSystem), [rows]);

  function resetPageForm() {
    setFormSlug("");
    setFormSlugTouched(false);
    setFormTitle("");
    setFormSeoTitle("");
    setFormSeoDescription("");
    setFormStatus("draft");
  }

  function closePageDialog() {
    setPageDialog(null);
    resetPageForm();
  }

  function closeSectionDialog() {
    setSectionDialog(null);
    setActiveSection(null);
    setSectionTitleDraft("");
    setSectionContentDraft("");
  }

  function openCreatePage() {
    resetPageForm();
    setPageDialog("create");
  }

  function openDeletePage() {
    setPageDialog("delete");
  }

  const slugValue = formSlug.trim();
  const slugError =
    slugValue.length === 0
      ? null
      : SLUG_RX.test(slugValue)
        ? null
        : "Slug must be kebab-case (lowercase letters, digits, single dashes).";
  const titleValue = formTitle.trim();
  const isSystemEdit = pageDialog === "edit" && selected?.isSystem === true;
  const slugLocked = isSystemEdit;

  const createDisabled =
    titleValue.length === 0 ||
    slugValue.length === 0 ||
    slugError !== null ||
    createMut.isPending;

  const updatePageMetaDisabled =
    !selected ||
    titleValue.length === 0 ||
    slugValue.length === 0 ||
    slugError !== null ||
    updateMut.isPending;

  const persistBody = useCallback(
    (
      vars: Parameters<typeof updateMut.mutate>[0],
      opts?: {
        toastMessage?: string;
        onDone?: () => void;
      },
    ) => {
      updateMut.mutate(vars, {
        onSuccess: () => {
          if (opts?.toastMessage) toast.success(opts.toastMessage);
          opts?.onDone?.();
        },
      });
    },
    [updateMut],
  );

  const saveSections = useCallback(
    (
      page: PageRow,
      next: CmsPageSectionRecord[],
      opts?: { silent?: boolean; onDone?: () => void },
    ) => {
      if (page.bodyFormat === "markdown") {
        const body = next[0]?.content ?? "";
        persistBody(
          { id: page.id, body },
          {
            toastMessage: opts?.silent ? undefined : "Section saved.",
            onDone: opts?.onDone,
          },
        );
        return;
      }
      persistBody(
        {
          id: page.id,
          body: serializeHtmlSectionsToStoredBody(next),
        },
        {
          toastMessage: opts?.silent ? undefined : "Section saved.",
          onDone: opts?.onDone,
        },
      );
    },
    [persistBody],
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!selected || selected.bodyFormat !== "html") return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(sections, oldIndex, newIndex);
    persistBody(
      {
        id: selected.id,
        body: serializeHtmlSectionsToStoredBody(normalizeSectionOrders(moved)),
      },
      { toastMessage: "Section order updated." },
    );
  }

  function handleTogglePublish() {
    if (!selected) return;
    persistBody(
      {
        id: selected.id,
        status: selected.status === "published" ? "draft" : "published",
      },
      {
        toastMessage:
          selected.status === "published" ? "Moved to draft." : "Published.",
      },
    );
  }

  function openAddSection() {
    if (!selected || selected.bodyFormat !== "html") return;
    setSectionTitleDraft("");
    setSectionDialog("add");
  }

  function confirmAddSection() {
    if (!selected) return;
    const title = sectionTitleDraft.trim() || "Untitled section";
    if (selected.bodyFormat !== "html") {
      toast.error("Markdown pages use one block.");
      return;
    }
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `section-${Date.now()}`;
    const next: CmsPageSectionRecord = {
      id,
      type: "text",
      title,
      content: "",
      order: sections.length,
    };
    saveSections(selected, normalizeSectionOrders([...sections, next]), {
      silent: true,
    });
    closeSectionDialog();
    toast.success("Section added.");
  }

  function openEditSection(s: CmsPageSectionRecord) {
    setActiveSection(s);
    setSectionTitleDraft(s.title);
    setSectionContentDraft(s.content);
    setSectionDialog("edit");
  }

  function confirmEditSection() {
    if (!selected || !activeSection) return;
    const title = sectionTitleDraft.trim() || "Untitled section";
    const content = sectionContentDraft;
    const next = sections.map((s) =>
      s.id === activeSection.id ? { ...s, title, content } : s,
    );
    saveSections(selected, next, { onDone: () => closeSectionDialog() });
  }

  function openViewSection(s: CmsPageSectionRecord) {
    setActiveSection(s);
    setSectionDialog("view");
  }

  function openDeleteSection(s: CmsPageSectionRecord) {
    setActiveSection(s);
    setSectionDialog("delete");
  }

  function confirmDeleteSection() {
    if (!selected || !activeSection) return;
    const next = sections.filter((s) => s.id !== activeSection.id);
    saveSections(selected, normalizeSectionOrders(next), {
      silent: true,
      onDone: () => {
        closeSectionDialog();
        toast.success("Section removed.");
      },
    });
  }

  const sidebarFiltered = useMemo(() => {
    const q = searchDraft.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [rows, searchDraft]);

  const hasSidebarRows = sidebarFiltered.length > 0;

  return (
    <>
      <Toaster richColors position="top-center" />

      <header className="v2-ahead" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <span className="v2-eyebrow">Content</span>
          <h1>
            Marketing <em>pages.</em>
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            Manage your platform&apos;s static pages and sections — publish when ready, preview
            before going live, and reorder HTML blocks.
          </p>
        </div>
      </header>

      <div
        className="v2-akpi-row v2-akpi-row--four"
        style={{ marginBottom: 20 }}
      >
        <KpiCard
          eyebrow="Total pages"
          icon="fileText"
          value={statsLoading ? "—" : (stats?.total ?? 0).toLocaleString()}
          note="All statuses"
        />
        <KpiCard
          eyebrow="Published"
          icon="globe"
          value={statsLoading ? "—" : (stats?.published ?? 0).toLocaleString()}
        />
        <KpiCard
          eyebrow="Drafts"
          icon="bookmark"
          value={statsLoading ? "—" : (stats?.drafts ?? 0).toLocaleString()}
        />
        <KpiCard
          eyebrow="System pages"
          icon="shield"
          value={statsLoading ? "—" : (stats?.system ?? 0).toLocaleString()}
          note="Seeded marketing slugs"
        />
      </div>

      <div className="flex min-h-[calc(100vh-220px)] flex-1 gap-5 overflow-hidden">
        <div
          className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--v2-ink-200)] bg-[var(--v2-bg,#fff)] shadow-sm"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          <div className="border-b border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-[var(--v2-ink-950)]">
                Pages
              </h2>
              <button
                type="button"
                onClick={openCreatePage}
                className="text-xs font-black uppercase tracking-wide text-[var(--v2-accent-deep)] transition-colors hover:text-[var(--v2-accent)]"
              >
                + Add new
              </button>
            </div>
            <input
              type="search"
              placeholder="Search pages…"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="w-full rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-bg,#fff)] px-3 py-2 text-sm font-medium text-[var(--v2-ink-900)] outline-none ring-[var(--v2-accent)] transition-shadow focus:border-[var(--v2-accent)] focus:ring-2 focus:ring-[var(--v2-accent-soft)]"
              aria-label="Search pages"
            />
            <label htmlFor="admin-pages-sidebar-status" className="sr-only">
              Filter by status
            </label>
            <select
              id="admin-pages-sidebar-status"
              className="v2-admin-users-select mt-3 !mt-3 h-9 w-full py-0 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            {!isLoading && !hasSeededRows ? (
              <Button
                type="button"
                variant="outline"
                className="mt-3 h-9 w-full text-xs"
                disabled={seedMut.isPending}
                onClick={() => seedMut.mutate()}
              >
                {seedMut.isPending ? "Seeding…" : "Seed marketing pages"}
              </Button>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="py-10 text-center text-sm text-[var(--v2-ink-500)]">
                Loading…
              </div>
            ) : isError ? (
              <div className="p-3 text-sm text-red-600">
                {error?.message ?? "Could not load pages."}
              </div>
            ) : !hasSidebarRows ? (
              <div className="p-4 text-center text-sm font-medium text-[var(--v2-ink-400)]">
                {searchDraft.trim() ? "No pages match." : "No pages yet."}
              </div>
            ) : (
              <div className="space-y-1">
                {sidebarFiltered.map((page) => {
                  const IconComponent = getPageIcon(page.slug, page.title);
                  const isSelected = selected?.id === page.id;
                  const isPublished = page.status === "published";
                  return (
                    <div
                      key={page.id}
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-xl p-2.5 transition-all",
                        isSelected
                          ? "scale-[1.01] bg-[var(--v2-ink-950)] text-white shadow-md"
                          : "text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-950)]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setFocusedPageId(page.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div
                          className={cn(
                            "shrink-0 rounded-lg p-1.5",
                            isSelected
                              ? "bg-[var(--v2-ink-800)] text-white"
                              : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-700)] group-hover:bg-white",
                          )}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <span className="truncate text-sm font-bold">
                          {getPageListLabel(page.slug, page.title)}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setFocusedPageId(page.id);
                            setFormTitle(page.title);
                            setFormSlug(page.slug);
                            setFormSlugTouched(true);
                            setFormSeoTitle(page.seoTitle ?? "");
                            setFormSeoDescription(page.seoDescription ?? "");
                            setFormStatus(page.status);
                            setPageDialog("edit");
                          }}
                          className={cn(
                            "rounded-lg p-1.5 transition-colors",
                            isSelected
                              ? "hover:bg-[var(--v2-ink-800)]"
                              : "hover:bg-[var(--v2-ink-200)]",
                          )}
                          title="Edit page details"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <span title={isPublished ? "Published" : "Draft"} className="p-1.5">
                          {isPublished ? (
                            <CheckCircle2
                              className={cn(
                                "h-3.5 w-3.5",
                                isSelected ? "text-[var(--v2-accent)]" : "text-emerald-600",
                              )}
                            />
                          ) : (
                            <Circle
                              className={cn(
                                "h-3.5 w-3.5",
                                isSelected ? "text-[var(--v2-ink-400)]" : "text-amber-500",
                              )}
                            />
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--v2-ink-200)] bg-[var(--v2-bg,#fff)] shadow-sm"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
              <div className="mb-6 inline-block rounded-3xl bg-[var(--v2-ink-50)] p-6">
                <FileText className="h-12 w-12 text-[var(--v2-ink-300)]" />
              </div>
              <h3 className="text-lg font-black text-[var(--v2-ink-950)]">No page selected</h3>
              <p className="mt-2 max-w-sm text-sm font-medium text-[var(--v2-ink-500)]">
                Choose a page from the list to manage sections, preview content, and publish.
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-y-auto p-6">
              <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--v2-ink-950)] text-white shadow-sm">
                      {(() => {
                        const IconComponent = getPageIcon(selected.slug, selected.title);
                        return <IconComponent className="h-5 w-5" />;
                      })()}
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-[var(--v2-ink-950)]">
                      {getPageListLabel(selected.slug, selected.title)}
                    </h2>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm",
                        selected.status === "published"
                          ? "border-emerald-200/60 bg-emerald-50 text-emerald-800"
                          : "border-[var(--v2-ink-200)] bg-[var(--v2-ink-100)] text-[var(--v2-ink-600)]",
                      )}
                    >
                      {selected.status === "published" ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p
                    className="ml-0 text-sm font-bold text-[var(--v2-ink-400)] md:ml-12"
                    style={{ fontFamily: "var(--v2-font-mono, ui-monospace)" }}
                  >
                    {selected.slug ? publicPathForSlug(selected.slug) : "/"}
                  </p>
                  <p className="ml-0 mt-1 text-xs text-[var(--v2-ink-500)] md:ml-12">
                    {selected.bodyFormat === "html" ? "HTML" : "Markdown (single block)"}
                    {selected.isSystem ? " · System page" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <div className="flex rounded-2xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-100)] p-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewMode((v) => !v)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                        previewMode
                          ? "bg-[var(--v2-bg,#fff)] text-[var(--v2-ink-950)] shadow-sm"
                          : "text-[var(--v2-ink-500)] hover:text-[var(--v2-ink-950)]",
                      )}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {previewMode ? "Edit mode" : "Preview"}
                    </button>
                    {selected.status === "published" ? (
                      <a
                        href={publicPathForSlug(selected.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-[var(--v2-ink-500)] transition-colors hover:text-[var(--v2-ink-950)]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Live
                      </a>
                    ) : (
                      <span
                        className="flex cursor-not-allowed items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-[var(--v2-ink-300)]"
                        title="Publish to open the public URL."
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Live
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleTogglePublish}
                    disabled={updateMut.isPending}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold shadow-sm transition-all",
                      selected.status === "published"
                        ? "border border-[var(--v2-ink-200)] bg-[var(--v2-bg,#fff)] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)]"
                        : "bg-[var(--v2-ink-950)] text-white hover:bg-[var(--v2-ink-800)]",
                    )}
                  >
                    {selected.status === "published" ? (
                      <>
                        <Circle className="h-3.5 w-3.5" />
                        Recall to draft
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Publish
                      </>
                    )}
                  </button>
                </div>
              </div>

              {previewMode ? (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <div className="mb-3 flex items-center justify-between rounded-2xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-4 py-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[var(--v2-ink-950)]">
                      Page preview
                    </h3>
                    <button
                      type="button"
                      onClick={() => setPreviewMode(false)}
                      className="rounded-lg p-1.5 text-[var(--v2-ink-500)] transition-colors hover:bg-[var(--v2-ink-200)]"
                      title="Close preview"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="max-h-[min(700px,70vh)] overflow-y-auto overflow-x-hidden rounded-2xl">
                    <AdminBodyPreview body={selected.body} bodyFormat={selected.bodyFormat} />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <h3 className="text-base font-black text-[var(--v2-ink-950)]">
                      Page sections
                    </h3>
                    {sections.length > 0 && selected.bodyFormat === "html" ? (
                      <button
                        type="button"
                        onClick={openAddSection}
                        className="flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-100"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add section
                      </button>
                    ) : null}
                  </div>

                  {sections.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--v2-ink-300)] bg-[var(--v2-ink-50)] p-12 text-center transition-colors hover:border-[var(--v2-accent)]">
                      <p className="mb-6 text-sm font-medium text-[var(--v2-ink-500)]">
                        {selected.bodyFormat === "markdown"
                          ? "This Markdown page has no body yet."
                          : "No sections yet. Create the first content block."}
                      </p>
                      <Button
                        type="button"
                        className="v2-admin-users-add-btn rounded-xl px-6 py-3 text-sm font-bold shadow-md"
                        onClick={() => {
                          if (selected.bodyFormat === "markdown") {
                            openEditSection({
                              id: "markdown-body",
                              type: "text",
                              title: selected.title || "Page content",
                              content: "",
                              order: 0,
                            });
                          } else {
                            openAddSection();
                          }
                        }}
                      >
                        {selected.bodyFormat === "markdown"
                          ? "Edit page content"
                          : "Create first section"}
                      </Button>
                    </div>
                  ) : canDragSections ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={sections.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4">
                          {sections.map((section) => (
                            <SortableSectionRow key={section.id} id={section.id}>
                              {(drag: SortableDragProps) => (
                                <SectionCard
                                  section={section}
                                  bodyFormat={selected.bodyFormat}
                                  drag={drag}
                                  onView={() => openViewSection(section)}
                                  onEdit={() => openEditSection(section)}
                                  onDelete={() => openDeleteSection(section)}
                                />
                              )}
                            </SortableSectionRow>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="space-y-4">
                      {sections.map((section) => (
                        <SectionCard
                          key={section.id}
                          section={section}
                          bodyFormat={selected.bodyFormat}
                          drag={null}
                          onView={() => openViewSection(section)}
                          onEdit={() => openEditSection(section)}
                          onDelete={() => openDeleteSection(section)}
                        />
                      ))}
                    </div>
                  )}

                  {selected.bodyFormat === "html" && sections.length > 0 ? (
                    <p className="mt-4 text-xs text-[var(--v2-ink-500)]">
                      Multiple sections are stored as JSON in this page&apos;s HTML body field.
                      Markdown pages always use one editor block.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={pageDialog === "create" || pageDialog === "edit"}
        onOpenChange={(o) => {
          if (!o) closePageDialog();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
              {pageDialog === "edit" ? "Edit page" : "New page"}
            </DialogTitle>
            <DialogDescription>
              {pageDialog === "edit"
                ? `Metadata for ${selected?.slug ? publicPathForSlug(selected.slug) : "—"}. Body content lives in sections.`
                : "Creates an HTML page with empty sections — add blocks from the editor."}
            </DialogDescription>
          </DialogHeader>

          {isSystemEdit && selected?.servedByMarketingRoute ? (
            <div
              className="rounded-md border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--v2-accent, #1CAAE2)",
                background: "rgba(28, 170, 226, 0.08)",
                color: "var(--v2-ink-700, inherit)",
              }}
              role="status"
            >
              {selected.slug === "contact" ? (
                <>
                  <strong>System page.</strong> Publishing updates the headline and intro
                  on <code>/contact</code>. The form and email card stay in the app.
                  Drafts fall back to seeded defaults.
                </>
              ) : (
                <>
                  <strong>System page.</strong> Publishing updates the marketing route
                  backed by CMS; drafts may fall back to seeded defaults where applicable.
                </>
              )}
            </div>
          ) : null}

          <div className="v2-admin-users-field">
            <label htmlFor="admin-page-title">Title</label>
            <input
              id="admin-page-title"
              value={formTitle}
              onChange={(e) => {
                setFormTitle(e.target.value);
                if (!formSlugTouched && pageDialog === "create") {
                  setFormSlug(slugifyDraft(e.target.value));
                }
              }}
              autoComplete="off"
            />
          </div>

          <div className="v2-admin-users-field">
            <label htmlFor="admin-page-slug">Slug</label>
            <input
              id="admin-page-slug"
              value={formSlug}
              readOnly={slugLocked}
              onChange={(e) => {
                setFormSlug(e.target.value.toLowerCase());
                setFormSlugTouched(true);
              }}
              autoComplete="off"
              style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                opacity: slugLocked ? 0.6 : 1,
              }}
              placeholder="about-our-team"
            />
            <div
              className="text-xs"
              style={{
                marginTop: 4,
                color: slugError
                  ? "var(--v2-danger, #b91c1c)"
                  : "var(--v2-ink-500)",
              }}
            >
              {slugLocked
                ? "System pages have a locked slug."
                : (slugError ?? `Public URL: /${slugValue || "your-slug"}`)}
            </div>
          </div>

          <div className="v2-admin-users-field">
            <label htmlFor="admin-page-status">Status</label>
            <select
              id="admin-page-status"
              className="v2-admin-users-select"
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as PageStatus)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          {pageDialog === "edit" ? (
            <div className="rounded-lg border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3 py-2 text-xs text-[var(--v2-ink-600)]">
              Body format:{" "}
              <strong className="text-[var(--v2-ink-900)]">
                {selected?.bodyFormat === "html" ? "HTML" : "Markdown"}
              </strong>
            </div>
          ) : null}

          <div className="v2-admin-users-field">
            <label htmlFor="admin-page-seo-title">SEO title (optional)</label>
            <input
              id="admin-page-seo-title"
              value={formSeoTitle}
              onChange={(e) => setFormSeoTitle(e.target.value)}
              autoComplete="off"
              placeholder="Falls back to the title above"
            />
          </div>

          <div className="v2-admin-users-field">
            <label htmlFor="admin-page-seo-desc">SEO description (optional)</label>
            <input
              id="admin-page-seo-desc"
              value={formSeoDescription}
              onChange={(e) => setFormSeoDescription(e.target.value)}
              autoComplete="off"
              placeholder="One sentence for search results and link previews"
            />
          </div>

          <DialogFooter className="mx-0 mb-0 flex flex-col-reverse gap-1.5 border-0 bg-transparent px-1 pb-2 pt-3 sm:flex-row sm:justify-end">
            {pageDialog === "edit" && selected && !selected.isSystem ? (
              <Button type="button" variant="destructive" className="mr-auto" onClick={openDeletePage}>
                Delete page
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={closePageDialog}>
              Cancel
            </Button>
            {pageDialog === "edit" ? (
              <Button
                type="button"
                disabled={updatePageMetaDisabled}
                onClick={() => {
                  if (!selected) return;
                  persistBody(
                    {
                      id: selected.id,
                      slug: slugLocked ? undefined : slugValue,
                      title: titleValue,
                      seoTitle: formSeoTitle.trim() || null,
                      seoDescription: formSeoDescription.trim() || null,
                      status: formStatus,
                    },
                    { toastMessage: "Page saved.", onDone: () => closePageDialog() },
                  );
                }}
              >
                Save
              </Button>
            ) : (
              <Button
                type="button"
                disabled={createDisabled}
                onClick={() => {
                  createMut.mutate({
                    slug: slugValue,
                    title: titleValue,
                    body: "[]",
                    bodyFormat: "html",
                    seoTitle: formSeoTitle.trim() || null,
                    seoDescription: formSeoDescription.trim() || null,
                    status: formStatus,
                  });
                }}
              >
                Create page
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pageDialog === "delete"}
        onOpenChange={(o) => {
          if (!o) setPageDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
              Delete page
            </DialogTitle>
            <DialogDescription>
              Permanently delete <strong>{selected?.title}</strong> (
              <code>{selected?.slug ? publicPathForSlug(selected.slug) : "—"}</code>). This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 flex flex-col-reverse gap-1.5 border-0 bg-transparent px-1 pb-2 pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setPageDialog(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!selected || deleteMut.isPending}
              onClick={() => {
                if (!selected) return;
                deleteMut.mutate({ id: selected.id });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={sectionDialog === "add"}
        onOpenChange={(o) => {
          if (!o) closeSectionDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Add section</DialogTitle>
            <DialogDescription>
              Adds a new HTML block at the end of the JSON section list for this page.
            </DialogDescription>
          </DialogHeader>
          <div className="v2-admin-users-field">
            <label htmlFor="admin-new-section-title">Section title</label>
            <input
              id="admin-new-section-title"
              value={sectionTitleDraft}
              onChange={(e) => setSectionTitleDraft(e.target.value)}
              placeholder="e.g. Overview"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeSectionDialog}>
              Cancel
            </Button>
            <Button type="button" className="v2-admin-users-add-btn" onClick={confirmAddSection}>
              Add section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={sectionDialog === "edit"}
        onOpenChange={(o) => {
          if (!o) closeSectionDialog();
        }}
      >
        <DialogContent
          className="flex max-h-[90vh] flex-col gap-4 overflow-y-auto sm:max-w-3xl"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>Edit section</DialogTitle>
            <DialogDescription>
              {selected?.bodyFormat === "markdown"
                ? "Markdown applies to the full public body."
                : "Rich HTML for this block."}
            </DialogDescription>
          </DialogHeader>
          <div className="v2-admin-users-field">
            <label htmlFor="admin-section-edit-title">Title</label>
            <input
              id="admin-section-edit-title"
              value={sectionTitleDraft}
              onChange={(e) => setSectionTitleDraft(e.target.value)}
            />
          </div>
          <div className="v2-admin-users-field">
            <span className="mb-1 block text-sm font-semibold leading-none">Content</span>
            {selected?.bodyFormat === "markdown" ? (
              <textarea
                id="admin-section-md"
                value={sectionContentDraft}
                onChange={(e) => setSectionContentDraft(e.target.value)}
                rows={16}
                className="mt-2 w-full rounded-md border border-[var(--v2-ink-200)] p-3 font-mono text-sm"
              />
            ) : (
              <div className="mt-2">
                <CmsRichTextEditor
                  id="admin-section-html"
                  value={sectionContentDraft}
                  onChange={setSectionContentDraft}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeSectionDialog}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmEditSection}>
              Save section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={sectionDialog === "view"}
        onOpenChange={(o) => {
          if (!o) closeSectionDialog();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>{activeSection?.title || "Section"}</DialogTitle>
            <DialogDescription className="font-mono text-xs uppercase tracking-wide">
              {activeSection ? getSectionTypeLabel(activeSection.type) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] p-4">
            {selected?.bodyFormat === "markdown" ? (
              <div className="v2-prose max-w-none text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeSection?.content ?? ""}</ReactMarkdown>
              </div>
            ) : (
              <div
                className="v2-prose max-w-none text-sm"
                dangerouslySetInnerHTML={{
                  __html: sanitizeCmsHtml(activeSection?.content ?? ""),
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={sectionDialog === "delete"}
        onOpenChange={(o) => {
          if (!o) closeSectionDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Delete section</DialogTitle>
            <DialogDescription>
              Remove &quot;{activeSection?.title || "Untitled"}&quot; from this page? This saves
              immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeSectionDialog}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteSection}>
              <Trash2 className="mr-2 inline h-4 w-4 align-text-bottom" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionCard({
  section,
  bodyFormat,
  drag,
  onView,
  onEdit,
  onDelete,
}: {
  section: CmsPageSectionRecord;
  bodyFormat: CmsBodyFormat;
  drag: SortableDragProps | null;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const preview =
    section.content.trim().length > 0
      ? sectionPreviewSnippet(section.content, bodyFormat)
      : "Empty section — click edit to add content.";

  return (
    <div className="group rounded-2xl border border-[var(--v2-ink-200)] bg-[var(--v2-bg,#fff)] p-4 shadow-sm transition-all duration-200 hover:border-[var(--v2-ink-300)] hover:shadow-md">
      <div className="flex items-center gap-4">
        {drag ? (
          <div
            className="-m-2 shrink-0 cursor-grab touch-manipulation rounded-xl p-2 text-[var(--v2-ink-300)] transition-colors hover:text-[var(--v2-ink-500)] active:cursor-grabbing"
            {...drag.attributes}
            {...drag.listeners}
          >
            <GripVertical className="h-5 w-5" aria-hidden />
          </div>
        ) : (
          <div className="w-9 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h4 className="text-[15px] font-bold tracking-tight text-[var(--v2-ink-950)]">
              {section.title || "Untitled section"}
            </h4>
            <span className="inline-flex items-center rounded-md border border-[var(--v2-ink-200)] bg-[var(--v2-ink-100)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--v2-ink-600)]">
              {getSectionTypeLabel(section.type)}
            </span>
          </div>
          <p className="truncate text-xs font-medium text-[var(--v2-ink-400)]">{preview}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onView}
            className="rounded-xl p-2 text-[var(--v2-ink-400)] transition-colors hover:bg-[var(--v2-accent-soft)] hover:text-[var(--v2-accent-deep)]"
            title="Quick view"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl p-2 text-[var(--v2-ink-400)] transition-colors hover:bg-[var(--v2-sand)] hover:text-[var(--v2-ink-950)]"
            title="Edit section"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl p-2 text-[var(--v2-ink-400)] transition-colors hover:bg-[var(--v2-coral-soft)] hover:text-[var(--v2-coral)]"
            title="Delete section"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}