"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { api } from "@/lib/trpc/client";
import type { QuizQuestion, TrainingLesson } from "@/server/db/schema";
import { cn } from "@/lib/utils";

type LessonKind = TrainingLesson["kind"];

const KIND_OPTIONS: { value: LessonKind; label: string; hint: string }[] = [
  { value: "video", label: "Video", hint: "Embed a video from YouTube, Vimeo, Mux, etc." },
  { value: "practice", label: "Practice", hint: "Markdown-authored walkthrough or exercise." },
  { value: "quiz", label: "Quiz", hint: "Multiple-choice questions with a pass threshold." },
];

const VIDEO_PROVIDERS = ["youtube", "vimeo", "mux", "cloudflare", "other"] as const;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function newQuestion(): QuizQuestion {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: "",
    options: ["", "", "", ""],
    correctIdx: 0,
  };
}

type Props =
  | {
      mode: "create";
      trainingId: string;
      moduleId: string;
      initial?: undefined;
    }
  | {
      mode: "edit";
      trainingId: string;
      moduleId: string;
      initial: TrainingLesson;
    };

export function LessonForm(props: Props) {
  const router = useRouter();
  const { mode, trainingId, moduleId } = props;
  const initial = mode === "edit" ? props.initial : undefined;

  const backHref = `/admin/trainings/${trainingId}/curriculum`;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [kind, setKind] = useState<LessonKind>(initial?.kind ?? "video");
  const [durationLabel, setDurationLabel] = useState(
    initial?.durationLabel ?? "",
  );

  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [videoProvider, setVideoProvider] = useState(
    initial?.videoProvider ?? "youtube",
  );

  const [practiceMarkdown, setPracticeMarkdown] = useState(
    initial?.practiceMarkdown ?? "",
  );

  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initial?.quizQuestionsJson?.length
      ? [...initial.quizQuestionsJson]
      : [newQuestion()],
  );
  const [passThreshold, setPassThreshold] = useState<string>(
    initial?.quizPassThreshold !== null && initial?.quizPassThreshold !== undefined
      ? String(initial.quizPassThreshold)
      : "80",
  );

  const suggestedSlug = useMemo(() => slugify(title), [title]);

  const createMut = api.admin.trainings.lessonCreate.useMutation({
    onSuccess: () => {
      toast.success("Lesson created.");
      router.push(backHref);
      router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = api.admin.trainings.lessonUpdate.useMutation({
    onSuccess: () => {
      toast.success("Lesson saved.");
      router.push(backHref);
      router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const submitting = createMut.isPending || updateMut.isPending;

  function onTitleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setTitle(next);
    if (!slugTouched && mode === "create") setSlug(slugify(next));
  }

  function updateQuestion(idx: number, patch: Partial<QuizQuestion>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    );
  }

  function updateQuestionOption(idx: number, optIdx: 0 | 1 | 2 | 3, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        const options: [string, string, string, string] = [...q.options] as [
          string,
          string,
          string,
          string,
        ];
        options[optIdx] = value;
        return { ...q, options };
      }),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, newQuestion()]);
  }

  function removeQuestion(idx: number) {
    setQuestions((prev) =>
      prev.length <= 1 ? [newQuestion()] : prev.filter((_, i) => i !== idx),
    );
  }

  function onSubmit() {
    const trimmedSlug = slug.trim();
    const payload = {
      slug: trimmedSlug,
      title: title.trim(),
      kind,
      durationLabel: durationLabel.trim(),
      videoUrl: kind === "video" ? videoUrl.trim() || null : null,
      videoProvider:
        kind === "video" ? (videoProvider.trim() || null) : null,
      practiceMarkdown: kind === "practice" ? practiceMarkdown : null,
      quizQuestionsJson:
        kind === "quiz"
          ? questions.map((q) => ({
              id: q.id,
              prompt: q.prompt.trim(),
              options: q.options.map((o) => o.trim()) as [
                string,
                string,
                string,
                string,
              ],
              correctIdx: q.correctIdx,
              explanation:
                q.explanation && q.explanation.trim()
                  ? q.explanation.trim()
                  : undefined,
            }))
          : null,
      quizPassThreshold:
        kind === "quiz"
          ? Math.max(0, Math.min(100, Number.parseInt(passThreshold, 10) || 0))
          : null,
    };

    if (mode === "create") {
      createMut.mutate({ ...payload, moduleId });
    } else if (initial) {
      updateMut.mutate({
        ...payload,
        id: initial.id,
        sortOrder: initial.sortOrder,
      });
    }
  }

  const selectClass =
    "flex h-10 w-full rounded-xl border border-[var(--v2-ink-200)] bg-white px-3 text-sm font-medium text-[var(--v2-ink-950)] outline-none focus-visible:border-[var(--v2-accent)] focus-visible:ring-2 focus-visible:ring-[var(--v2-accent-soft)]";
  const textareaClass = cn(
    "flex w-full rounded-xl border border-[var(--v2-ink-200)] bg-white px-3 py-2 font-mono text-sm text-[var(--v2-ink-950)] outline-none transition-colors",
    "placeholder:text-muted-foreground focus-visible:border-[var(--v2-accent)] focus-visible:ring-2 focus-visible:ring-[var(--v2-accent-soft)]",
  );

  return (
    <>
      <Toaster richColors position="top-center" />

      <header className="v2-ahead" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <div className="v2-atop-crumb">
            Manage · <strong>Workforce</strong> ·{" "}
            <Link
              href="/admin/trainings"
              className="underline decoration-dotted underline-offset-2"
            >
              Trainings
            </Link>{" "}
            ·{" "}
            <Link
              href={backHref}
              className="underline decoration-dotted underline-offset-2"
            >
              Curriculum
            </Link>
          </div>
          <h1>
            {mode === "create" ? (
              <>
                New <em>lesson.</em>
              </>
            ) : (
              <>
                Edit <em>{initial?.title}</em>
              </>
            )}
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            Video lessons embed an external player; practice lessons render Markdown;
            quiz lessons score four-option multiple choice against a pass threshold.
          </p>
        </div>
      </header>

      <div className="v2-org-grid" style={{ gridTemplateColumns: "1fr" }}>
        {/* Basics */}
        <section className="v2-acard v2-org-card">
          <h2 className="v2-org-section-label" style={{ marginBottom: 12 }}>
            Basics
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="l-title">Title</Label>
              <Input
                id="l-title"
                value={title}
                onChange={onTitleChange}
                placeholder="e.g. Hydrogen sulphide fundamentals"
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="l-slug">Slug</Label>
              <Input
                id="l-slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder={suggestedSlug || "hydrogen-sulphide-fundamentals"}
                className="rounded-xl font-mono"
              />
              {mode === "create" && !slugTouched && suggestedSlug ? (
                <p className="text-xs text-[var(--v2-ink-500)]">
                  Auto-generated from title. Type here to override.
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="l-duration">Duration label</Label>
              <Input
                id="l-duration"
                value={durationLabel}
                onChange={(e) => setDurationLabel(e.target.value)}
                placeholder="e.g. 12 min · video"
                className="rounded-xl"
              />
            </div>
          </div>
        </section>

        {/* Kind */}
        <section className="v2-acard v2-org-card">
          <h2 className="v2-org-section-label" style={{ marginBottom: 12 }}>
            Lesson kind
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {KIND_OPTIONS.map((k) => (
              <label
                key={k.value}
                className={cn(
                  "cursor-pointer rounded-2xl border p-4 text-sm",
                  kind === k.value
                    ? "border-[var(--v2-accent)] bg-[var(--v2-accent-soft)] shadow-inner"
                    : "border-[var(--v2-ink-200)] bg-white hover:border-[var(--v2-ink-300)]",
                )}
              >
                <input
                  type="radio"
                  name="lesson-kind"
                  value={k.value}
                  checked={kind === k.value}
                  onChange={() => setKind(k.value)}
                  className="sr-only"
                />
                <p className="text-sm font-bold text-[var(--v2-ink-950)]">{k.label}</p>
                <p className="mt-1 text-xs text-[var(--v2-ink-600)]">{k.hint}</p>
              </label>
            ))}
          </div>
        </section>

        {/* Kind-specific content */}
        {kind === "video" ? (
          <section className="v2-acard v2-org-card">
            <h2 className="v2-org-section-label" style={{ marginBottom: 12 }}>
              Video source
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="l-video-url">Video URL</Label>
                <Input
                  id="l-video-url"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://…"
                  className="rounded-xl font-mono"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="l-video-provider">Provider</Label>
                <select
                  id="l-video-provider"
                  className={selectClass}
                  value={videoProvider}
                  onChange={(e) => setVideoProvider(e.target.value)}
                >
                  {VIDEO_PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--v2-ink-500)]">
                  Used to pick the embed player.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {kind === "practice" ? (
          <section className="v2-acard v2-org-card">
            <h2 className="v2-org-section-label" style={{ marginBottom: 12 }}>
              Practice content
            </h2>
            <div className="grid gap-2">
              <Label htmlFor="l-practice">Markdown</Label>
              <textarea
                id="l-practice"
                rows={18}
                value={practiceMarkdown}
                onChange={(e) => setPracticeMarkdown(e.target.value)}
                placeholder={
                  "# Objective\nWrite a Markdown walkthrough learners can follow at their own pace.\n\n1. Step one\n2. Step two"
                }
                className={cn(textareaClass, "min-h-[400px]")}
              />
              <p className="text-xs text-[var(--v2-ink-500)]">
                Rendered as Markdown on the learner page. Keep steps concrete and
                short.
              </p>
            </div>
          </section>
        ) : null}

        {kind === "quiz" ? (
          <section className="v2-acard v2-org-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="v2-org-section-label" style={{ marginBottom: 0 }}>
                Quiz
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="l-pass" className="text-xs">
                    Pass ≥
                  </Label>
                  <Input
                    id="l-pass"
                    type="number"
                    min={0}
                    max={100}
                    value={passThreshold}
                    onChange={(e) => setPassThreshold(e.target.value)}
                    className="h-9 w-20 rounded-xl"
                  />
                  <span className="text-xs text-[var(--v2-ink-500)]">%</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full text-xs font-semibold"
                  onClick={addQuestion}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Add question
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {questions.map((q, qi) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--v2-ink-500)]">
                      Question {qi + 1}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg border-[var(--v2-ink-200)] text-red-600 hover:bg-red-50"
                      onClick={() => removeQuestion(qi)}
                      aria-label={`Remove question ${qi + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor={`q-${qi}-prompt`}>Prompt</Label>
                      <textarea
                        id={`q-${qi}-prompt`}
                        rows={2}
                        value={q.prompt}
                        onChange={(e) =>
                          updateQuestion(qi, { prompt: e.target.value })
                        }
                        placeholder="What is the immediate danger threshold for H2S in ppm?"
                        className={cn(textareaClass, "min-h-[64px]")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Options (click radio to mark correct)</Label>
                      <div className="grid gap-2">
                        {([0, 1, 2, 3] as const).map((oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`q-${qi}-correct`}
                              checked={q.correctIdx === oi}
                              onChange={() =>
                                updateQuestion(qi, { correctIdx: oi })
                              }
                              aria-label={`Mark option ${oi + 1} as correct`}
                              className="h-4 w-4"
                            />
                            <Input
                              value={q.options[oi]}
                              onChange={(e) =>
                                updateQuestionOption(qi, oi, e.target.value)
                              }
                              placeholder={`Option ${oi + 1}`}
                              className="rounded-xl"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`q-${qi}-exp`}>
                        Explanation (optional)
                      </Label>
                      <Input
                        id={`q-${qi}-exp`}
                        value={q.explanation ?? ""}
                        onChange={(e) =>
                          updateQuestion(qi, { explanation: e.target.value })
                        }
                        placeholder="Shown after the learner answers."
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            asChild
            variant="outline"
            className="rounded-full"
            disabled={submitting}
          >
            <Link href={backHref}>Cancel</Link>
          </Button>
          <Button
            type="button"
            className="rounded-full bg-[var(--v2-ink-950)]"
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting
              ? "Saving…"
              : mode === "create"
                ? "Create lesson"
                : "Save changes"}
          </Button>
        </div>
      </div>
    </>
  );
}
