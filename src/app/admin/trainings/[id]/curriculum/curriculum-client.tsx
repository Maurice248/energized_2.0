"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  HelpCircle,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

type Tree = inferRouterOutputs<AppRouter>["admin"]["trainings"]["curriculumTree"];
type ModuleRow = Tree["modules"][number];
type LessonRow = ModuleRow["lessons"][number];

type ModuleEditorMode = "create" | "edit" | "delete" | null;

const KIND_LABEL: Record<LessonRow["kind"], string> = {
  video: "Video",
  practice: "Practice",
  quiz: "Quiz",
};

function kindIcon(kind: LessonRow["kind"]) {
  if (kind === "video") return <Video className="h-4 w-4" aria-hidden />;
  if (kind === "practice") return <NotebookPen className="h-4 w-4" aria-hidden />;
  return <HelpCircle className="h-4 w-4" aria-hidden />;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function CurriculumClient({
  trainingId,
  trainingTitle,
  trainingSlug,
}: {
  trainingId: string;
  trainingTitle: string;
  trainingSlug: string;
}) {
  const utils = api.useUtils();
  const { data, isLoading, isError, error } =
    api.admin.trainings.curriculumTree.useQuery({ trainingId });

  const modules = useMemo<ModuleRow[]>(() => data?.modules ?? [], [data]);

  const invalidateTree = useCallback(async () => {
    await utils.admin.trainings.curriculumTree.invalidate({ trainingId });
  }, [utils, trainingId]);

  /* ---------------- Module editor state ---------------- */

  const [moduleMode, setModuleMode] = useState<ModuleEditorMode>(null);
  const [activeModule, setActiveModule] = useState<ModuleRow | null>(null);

  const [formSlug, setFormSlug] = useState("");
  const [formSlugTouched, setFormSlugTouched] = useState(false);
  const [formNumber, setFormNumber] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDuration, setFormDuration] = useState("");

  const suggestedSlug = useMemo(() => slugify(formTitle), [formTitle]);

  function closeEditor() {
    setModuleMode(null);
    setActiveModule(null);
    setFormSlug("");
    setFormSlugTouched(false);
    setFormNumber("");
    setFormTitle("");
    setFormDuration("");
  }

  function openCreate() {
    setActiveModule(null);
    setFormSlug("");
    setFormSlugTouched(false);
    setFormNumber(String(modules.length + 1).padStart(2, "0"));
    setFormTitle("");
    setFormDuration("");
    setModuleMode("create");
  }

  function openEdit(m: ModuleRow) {
    setActiveModule(m);
    setFormSlug(m.slug);
    setFormSlugTouched(true);
    setFormNumber(m.number);
    setFormTitle(m.title);
    setFormDuration(m.durationLabel);
    setModuleMode("edit");
  }

  function openDelete(m: ModuleRow) {
    setActiveModule(m);
    setModuleMode("delete");
  }

  /* ---------------- Mutations ---------------- */

  const moduleCreate = api.admin.trainings.moduleCreate.useMutation({
    onSuccess: async () => {
      toast.success("Module added.");
      await invalidateTree();
      closeEditor();
    },
    onError: (e) => toast.error(e.message),
  });

  const moduleUpdate = api.admin.trainings.moduleUpdate.useMutation({
    onSuccess: async () => {
      toast.success("Module saved.");
      await invalidateTree();
      closeEditor();
    },
    onError: (e) => toast.error(e.message),
  });

  const moduleDelete = api.admin.trainings.moduleDelete.useMutation({
    onSuccess: async () => {
      toast.success("Module removed.");
      await invalidateTree();
      closeEditor();
    },
    onError: (e) => toast.error(e.message),
  });

  const moduleReorder = api.admin.trainings.moduleReorder.useMutation({
    onSuccess: async () => {
      await invalidateTree();
    },
    onError: (e) => toast.error(e.message),
  });

  const lessonDelete = api.admin.trainings.lessonDelete.useMutation({
    onSuccess: async () => {
      toast.success("Lesson removed.");
      await invalidateTree();
    },
    onError: (e) => toast.error(e.message),
  });

  const lessonReorder = api.admin.trainings.lessonReorder.useMutation({
    onSuccess: async () => {
      await invalidateTree();
    },
    onError: (e) => toast.error(e.message),
  });

  const busyReorder = moduleReorder.isPending || lessonReorder.isPending;

  function moveModule(index: number, direction: -1 | 1) {
    if (busyReorder) return;
    const next = [...modules];
    const j = index + direction;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    moduleReorder.mutate({
      trainingId,
      orderedIds: next.map((m) => m.id),
    });
  }

  function moveLesson(module: ModuleRow, index: number, direction: -1 | 1) {
    if (busyReorder) return;
    const next = [...module.lessons];
    const j = index + direction;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    lessonReorder.mutate({
      moduleId: module.id,
      orderedIds: next.map((l) => l.id),
    });
  }

  const saveDisabled =
    formSlug.trim().length === 0 ||
    formTitle.trim().length === 0 ||
    formNumber.trim().length === 0 ||
    formDuration.trim().length === 0 ||
    moduleCreate.isPending ||
    moduleUpdate.isPending;

  function submitModule() {
    const slug = formSlugTouched ? formSlug.trim() : suggestedSlug;
    const payload = {
      slug,
      number: formNumber.trim(),
      title: formTitle.trim(),
      durationLabel: formDuration.trim(),
    };
    if (moduleMode === "create") {
      moduleCreate.mutate({ ...payload, trainingId });
      return;
    }
    if (moduleMode === "edit" && activeModule) {
      moduleUpdate.mutate({
        ...payload,
        id: activeModule.id,
        sortOrder: activeModule.sortOrder,
      });
    }
  }

  const [lessonDeleteTarget, setLessonDeleteTarget] = useState<LessonRow | null>(
    null,
  );

  function confirmLessonDelete() {
    if (!lessonDeleteTarget) return;
    lessonDelete.mutate(
      { id: lessonDeleteTarget.id },
      { onSuccess: () => setLessonDeleteTarget(null) },
    );
  }

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const dialogOpen = moduleMode === "create" || moduleMode === "edit";

  return (
    <>
      <Toaster richColors position="top-center" />

      <header
        className="v2-ahead"
        style={{ gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "start", gap: 24 }}
      >
        <div>
          <div className="v2-atop-crumb">
            Manage · <strong>Workforce</strong> ·{" "}
            <Link
              href="/admin/trainings"
              className="underline decoration-dotted underline-offset-2"
            >
              Trainings
            </Link>{" "}
            · {trainingTitle}
          </div>
          <h1>
            Curriculum · <em>{trainingTitle}</em>
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            {modules.length} module{modules.length === 1 ? "" : "s"} · {totalLessons}{" "}
            lesson{totalLessons === 1 ? "" : "s"}. Learner catalog:{" "}
            <Link
              href={`/trainings/${trainingSlug}`}
              target="_blank"
              rel="noreferrer"
              className="v2-acard-link"
            >
              /trainings/{trainingSlug}
            </Link>
            .
          </p>
        </div>
        <div style={{ alignSelf: "start" }}>
          <button
            type="button"
            className="v2-btn v2-btn-primary inline-flex items-center gap-1.5 shrink-0"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add module
          </button>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-[var(--v2-ink-500)]">Loading curriculum…</p>
      ) : isError ? (
        <p className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      ) : modules.length === 0 ? (
        <div className="v2-tbl-empty">
          No modules yet. Modules group lessons into pedagogical units — start with an{" "}
          <button
            type="button"
            onClick={openCreate}
            className="font-semibold text-[var(--v2-accent-deep)] underline-offset-2 hover:underline"
          >
            intro module
          </button>
          .
        </div>
      ) : (
        <div className="v2-org-grid" style={{ gridTemplateColumns: "1fr" }}>
          {modules.map((m, i) => (
            <article key={m.id} className="v2-acard v2-org-card">
              <header
                className="v2-org-card-head"
                style={{ alignItems: "start", gap: 12 }}
              >
                <div className="flex min-w-0 flex-1 gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--v2-ink-950)] text-sm font-black text-[var(--v2-accent)] shadow-inner"
                    aria-hidden
                  >
                    {m.number}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2
                      className="v2-org-co-name"
                      style={{ marginBottom: 4 }}
                    >
                      {m.title}
                    </h2>
                    <p
                      className="v2-org-dl-val"
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        fontSize: 13,
                      }}
                    >
                      {m.slug} · {m.durationLabel} · {m.lessons.length} lesson
                      {m.lessons.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-lg border-[var(--v2-ink-200)]"
                    disabled={i === 0 || busyReorder}
                    onClick={() => moveModule(i, -1)}
                    aria-label={`Move module ${m.title} up`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-lg border-[var(--v2-ink-200)]"
                    disabled={i === modules.length - 1 || busyReorder}
                    onClick={() => moveModule(i, 1)}
                    aria-label={`Move module ${m.title} down`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-lg border-[var(--v2-ink-200)]"
                    onClick={() => openEdit(m)}
                    aria-label={`Edit module ${m.title}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-lg border-[var(--v2-ink-200)] text-red-600 hover:bg-red-50"
                    onClick={() => openDelete(m)}
                    aria-label={`Delete module ${m.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </header>

              {m.lessons.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-4 py-3 text-sm text-[var(--v2-ink-600)]">
                  No lessons in this module yet.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {m.lessons.map((l, li) => (
                    <li
                      key={l.id}
                      className={cn(
                        "flex flex-wrap items-center gap-3 rounded-xl border border-[var(--v2-ink-200)] bg-white px-3 py-2",
                      )}
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--v2-ink-50)] text-[var(--v2-ink-700)]">
                        {kindIcon(l.kind)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--v2-ink-950)]">
                          {l.title}
                        </p>
                        <p className="truncate font-mono text-xs text-[var(--v2-ink-500)]">
                          {KIND_LABEL[l.kind]} · {l.slug} · {l.durationLabel}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-lg border-[var(--v2-ink-200)]"
                          disabled={li === 0 || busyReorder}
                          onClick={() => moveLesson(m, li, -1)}
                          aria-label={`Move lesson ${l.title} up`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-lg border-[var(--v2-ink-200)]"
                          disabled={li === m.lessons.length - 1 || busyReorder}
                          onClick={() => moveLesson(m, li, 1)}
                          aria-label={`Move lesson ${l.title} down`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          asChild
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-lg border-[var(--v2-ink-200)]"
                        >
                          <Link
                            href={`/admin/trainings/${trainingId}/modules/${m.id}/lessons/${l.id}/edit`}
                            aria-label={`Edit lesson ${l.title}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-lg border-[var(--v2-ink-200)] text-red-600 hover:bg-red-50"
                          onClick={() => setLessonDeleteTarget(l)}
                          aria-label={`Delete lesson ${l.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div style={{ marginTop: 12 }}>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link
                    href={`/admin/trainings/${trainingId}/modules/${m.id}/lessons/new`}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Add lesson
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Module create / edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-[var(--v2-ink-200)]">
          <DialogHeader>
            <DialogTitle>
              {moduleMode === "create" ? "New module" : "Edit module"}
            </DialogTitle>
            <DialogDescription>
              A module groups related lessons. Learners see modules on the training
              detail page.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mod-num">Number</Label>
                <Input
                  id="mod-num"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  placeholder="01"
                  className="rounded-xl font-mono"
                />
              </div>
              <div className="col-span-2 grid gap-2">
                <Label htmlFor="mod-title">Title</Label>
                <Input
                  id="mod-title"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    if (!formSlugTouched) setFormSlug(slugify(e.target.value));
                  }}
                  placeholder="e.g. H2S hazards and response"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mod-slug">Slug</Label>
              <Input
                id="mod-slug"
                value={formSlug}
                onChange={(e) => {
                  setFormSlug(e.target.value);
                  setFormSlugTouched(true);
                }}
                placeholder={suggestedSlug || "hazards-and-response"}
                className="rounded-xl font-mono"
              />
              {moduleMode === "create" && !formSlugTouched && suggestedSlug ? (
                <p className="text-xs text-[var(--v2-ink-500)]">
                  Auto-generated from title. Type here to override.
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mod-duration">Duration label</Label>
              <Input
                id="mod-duration"
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
                placeholder="e.g. 45 min · self-paced"
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={closeEditor}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[var(--v2-ink-950)]"
              disabled={saveDisabled}
              onClick={submitModule}
            >
              {moduleMode === "create" ? "Add module" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Module delete confirm */}
      <Dialog
        open={moduleMode === "delete"}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-[var(--v2-ink-200)]">
          <DialogHeader>
            <DialogTitle>Delete module</DialogTitle>
            <DialogDescription>
              This removes the module and{" "}
              <strong>all lessons inside it</strong>. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {activeModule ? (
            <div className="rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] p-3">
              <p className="text-sm font-semibold text-[var(--v2-ink-900)]">
                {activeModule.number} · {activeModule.title}
              </p>
              <p className="mt-1 text-xs text-[var(--v2-ink-500)]">
                {activeModule.lessons.length} lesson
                {activeModule.lessons.length === 1 ? "" : "s"} will be removed.
              </p>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={closeEditor}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              disabled={moduleDelete.isPending}
              onClick={() => {
                if (activeModule) moduleDelete.mutate({ id: activeModule.id });
              }}
            >
              Delete module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson delete confirm */}
      <Dialog
        open={!!lessonDeleteTarget}
        onOpenChange={(open) => {
          if (!open) setLessonDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-[var(--v2-ink-200)]">
          <DialogHeader>
            <DialogTitle>Delete lesson</DialogTitle>
            <DialogDescription>
              This removes the lesson from its module. Enrollment progress that
              references it will stay in the DB but stop rendering.
            </DialogDescription>
          </DialogHeader>
          {lessonDeleteTarget ? (
            <div className="rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] p-3">
              <p className="text-sm font-semibold text-[var(--v2-ink-900)]">
                <ClipboardList className="mr-1 inline h-4 w-4" aria-hidden />
                {lessonDeleteTarget.title}
              </p>
              <p className="mt-1 font-mono text-xs text-[var(--v2-ink-500)]">
                {KIND_LABEL[lessonDeleteTarget.kind]} · {lessonDeleteTarget.slug}
              </p>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setLessonDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              disabled={lessonDelete.isPending}
              onClick={confirmLessonDelete}
            >
              Delete lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
