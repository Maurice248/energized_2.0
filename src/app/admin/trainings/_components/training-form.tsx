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
import type { Training, TrainingUnlock } from "@/server/db/schema";
import { cn } from "@/lib/utils";

type TrainingSector = Training["sector"];
type TrainingLevel = Training["level"];

const SECTOR_OPTIONS: { value: TrainingSector; label: string }[] = [
  { value: "safety", label: "Safety" },
  { value: "tech", label: "Technical" },
  { value: "prof", label: "Professional" },
  { value: "soft", label: "Soft skills" },
  { value: "trans", label: "Transitions" },
];

const LEVEL_OPTIONS: { value: TrainingLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "all", label: "All levels" },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

type Mode = "create" | "edit";

type Props =
  | { mode: "create"; initial?: undefined }
  | { mode: "edit"; initial: Training };

export function TrainingForm(props: Props) {
  const router = useRouter();
  const mode: Mode = props.mode;
  const initial = props.mode === "edit" ? props.initial : undefined;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [shortBlurb, setShortBlurb] = useState(initial?.shortBlurb ?? "");
  const [longBlurb, setLongBlurb] = useState(initial?.longBlurb ?? "");
  const [sector, setSector] = useState<TrainingSector>(initial?.sector ?? "safety");
  const [level, setLevel] = useState<TrainingLevel>(initial?.level ?? "beginner");
  const [hours, setHours] = useState<string>(String(initial?.hours ?? 0));
  const [durationLabel, setDurationLabel] = useState(initial?.durationLabel ?? "");
  const [monogram, setMonogram] = useState(initial?.monogram ?? "");
  const [tileColor, setTileColor] = useState(initial?.tileColor ?? "#1CAAE2");
  const [instructorName, setInstructorName] = useState(initial?.instructorName ?? "");
  const [instructorRole, setInstructorRole] = useState(initial?.instructorRole ?? "");
  const [certName, setCertName] = useState(initial?.certName ?? "");
  const [outcomes, setOutcomes] = useState<string[]>(
    initial?.outcomesJson?.length ? [...initial.outcomesJson] : [""],
  );
  const [unlocks, setUnlocks] = useState<TrainingUnlock[]>(
    initial?.unlocksJson?.length
      ? [...initial.unlocksJson]
      : [{ role: "", co: "", band: "" }],
  );
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState<boolean>(initial?.isFeatured ?? false);
  const [isNew, setIsNew] = useState<boolean>(initial?.isNew ?? false);
  const [sortOrder, setSortOrder] = useState<string>(String(initial?.sortOrder ?? 0));

  const suggestedSlug = useMemo(() => slugify(title), [title]);

  const createMut = api.admin.trainings.create.useMutation({
    onSuccess: () => {
      toast.success("Training created.");
      router.push("/admin/trainings");
      router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = api.admin.trainings.update.useMutation({
    onSuccess: () => {
      toast.success("Training saved.");
      router.push("/admin/trainings");
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

  function onSlugChange(e: ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value);
    setSlugTouched(true);
  }

  function updateOutcome(i: number, value: string) {
    setOutcomes((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  }
  function addOutcome() {
    setOutcomes((prev) => [...prev, ""]);
  }
  function removeOutcome(i: number) {
    setOutcomes((prev) =>
      prev.length <= 1 ? [""] : prev.filter((_, idx) => idx !== i),
    );
  }

  function updateUnlock(i: number, key: keyof TrainingUnlock, value: string) {
    setUnlocks((prev) =>
      prev.map((u, idx) => (idx === i ? { ...u, [key]: value } : u)),
    );
  }
  function addUnlock() {
    setUnlocks((prev) => [...prev, { role: "", co: "", band: "" }]);
  }
  function removeUnlock(i: number) {
    setUnlocks((prev) =>
      prev.length <= 1
        ? [{ role: "", co: "", band: "" }]
        : prev.filter((_, idx) => idx !== i),
    );
  }

  function onSubmit() {
    const payload = {
      slug: slug.trim(),
      title: title.trim(),
      shortBlurb: shortBlurb.trim(),
      longBlurb: longBlurb.trim(),
      sector,
      level,
      hours: Number.parseInt(hours, 10) || 0,
      durationLabel: durationLabel.trim(),
      monogram: monogram.trim(),
      tileColor: tileColor.trim(),
      instructorName: instructorName.trim(),
      instructorRole: instructorRole.trim(),
      certName: certName.trim() ? certName.trim() : null,
      outcomesJson: outcomes.map((o) => o.trim()).filter(Boolean),
      unlocksJson: unlocks
        .map((u) => ({
          role: u.role.trim(),
          co: u.co.trim(),
          band: u.band.trim(),
        }))
        .filter((u) => u.role || u.co || u.band),
      isActive,
      isFeatured,
      isNew,
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
    };

    if (mode === "create") {
      createMut.mutate(payload);
    } else if (initial) {
      updateMut.mutate({ id: initial.id, ...payload });
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
            </Link>
          </div>
          <h1>
            {mode === "create" ? (
              <>
                New <em>training program.</em>
              </>
            ) : (
              <>
                Edit <em>{initial?.title}</em>
              </>
            )}
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            Programs appear in the learner catalog at <code>/trainings</code>. Hidden
            programs stay in the DB but do not surface to candidates.
            {mode === "edit" && initial ? (
              <>
                {" "}
                <Link
                  href={`/admin/trainings/${initial.id}/curriculum`}
                  className="v2-acard-link"
                >
                  Manage curriculum →
                </Link>
              </>
            ) : null}
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
              <Label htmlFor="t-title">Title</Label>
              <Input id="t-title" value={title} onChange={onTitleChange} placeholder="e.g. H2S Alive Certification" className="rounded-xl" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="t-slug">
                Slug{" "}
                <span className="text-xs font-normal text-[var(--v2-ink-500)]">
                  (URL segment)
                </span>
              </Label>
              <Input
                id="t-slug"
                value={slug}
                onChange={onSlugChange}
                placeholder={suggestedSlug || "h2s-alive-cert"}
                className="rounded-xl font-mono"
              />
              {mode === "create" && !slugTouched && suggestedSlug ? (
                <p className="text-xs text-[var(--v2-ink-500)]">
                  Auto-generated from title. Type here to override.
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="t-mono">Monogram</Label>
                <Input
                  id="t-mono"
                  value={monogram}
                  onChange={(e) => setMonogram(e.target.value)}
                  placeholder="H2S"
                  maxLength={4}
                  className="rounded-xl font-mono"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="t-color">Tile color</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="t-color"
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(tileColor) ? tileColor : "#1CAAE2"}
                    onChange={(e) => setTileColor(e.target.value)}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-[var(--v2-ink-200)] bg-white p-1"
                    aria-label="Tile color picker"
                  />
                  <Input
                    value={tileColor}
                    onChange={(e) => setTileColor(e.target.value)}
                    placeholder="#1CAAE2"
                    className="rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Classification */}
        <section className="v2-acard v2-org-card">
          <h2 className="v2-org-section-label" style={{ marginBottom: 12 }}>
            Classification
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="t-sector">Sector</Label>
              <select
                id="t-sector"
                className={selectClass}
                value={sector}
                onChange={(e) => setSector(e.target.value as TrainingSector)}
              >
                {SECTOR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-level">Level</Label>
              <select
                id="t-level"
                className={selectClass}
                value={level}
                onChange={(e) => setLevel(e.target.value as TrainingLevel)}
              >
                {LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-hours">Hours</Label>
              <Input
                id="t-hours"
                type="number"
                min={0}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-duration">Duration label</Label>
              <Input
                id="t-duration"
                value={durationLabel}
                onChange={(e) => setDurationLabel(e.target.value)}
                placeholder="e.g. 1 day · in-person"
                className="rounded-xl"
              />
            </div>
          </div>
        </section>

        {/* Instructor & cert */}
        <section className="v2-acard v2-org-card">
          <h2 className="v2-org-section-label" style={{ marginBottom: 12 }}>
            Instructor & certificate
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="t-inst-name">Instructor name</Label>
              <Input
                id="t-inst-name"
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
                placeholder="e.g. Diane Beaulieu"
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-inst-role">Instructor role</Label>
              <Input
                id="t-inst-role"
                value={instructorRole}
                onChange={(e) => setInstructorRole(e.target.value)}
                placeholder="e.g. Field HSE lead, 18 yrs"
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-cert">Certificate name (optional)</Label>
              <Input
                id="t-cert"
                value={certName}
                onChange={(e) => setCertName(e.target.value)}
                placeholder="e.g. H2S Alive (Enform)"
                className="rounded-xl"
              />
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="v2-acard v2-org-card">
          <h2 className="v2-org-section-label" style={{ marginBottom: 12 }}>
            Content
          </h2>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="t-short">Short blurb</Label>
              <textarea
                id="t-short"
                rows={2}
                value={shortBlurb}
                onChange={(e) => setShortBlurb(e.target.value)}
                placeholder="One-sentence hook for the catalog card."
                className={cn(textareaClass, "min-h-[64px]")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-long">Long blurb</Label>
              <textarea
                id="t-long"
                rows={8}
                value={longBlurb}
                onChange={(e) => setLongBlurb(e.target.value)}
                placeholder="Full description shown on the training detail page. Plain text or Markdown."
                className={cn(textareaClass, "min-h-[200px]")}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Learning outcomes</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full text-xs font-semibold"
                  onClick={addOutcome}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Add outcome
                </Button>
              </div>
              <div className="grid gap-2">
                {outcomes.map((o, i) => (
                  <div key={`out-${i}`} className="flex items-center gap-2">
                    <Input
                      value={o}
                      onChange={(e) => updateOutcome(i, e.target.value)}
                      placeholder="e.g. Identify H2S hazards on lease-road transit."
                      className="rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-xl border-[var(--v2-ink-200)] text-red-600 hover:bg-red-50"
                      onClick={() => removeOutcome(i)}
                      aria-label={`Remove outcome ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Access tiers / unlocks */}
        <section className="v2-acard v2-org-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="v2-org-section-label" style={{ marginBottom: 0 }}>
              Access tiers (paywall hints)
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full text-xs font-semibold"
              onClick={addUnlock}
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
              Add tier
            </Button>
          </div>
          <p className="text-xs text-[var(--v2-ink-500)]" style={{ marginBottom: 12 }}>
            Free-text tags describing who unlocks this training. Empty rows are ignored.
          </p>
          <div className="grid gap-2">
            {unlocks.map((u, i) => (
              <div key={`unlock-${i}`} className="flex items-start gap-2">
                <div className="grid flex-1 grid-cols-3 gap-2">
                  <Input
                    value={u.role}
                    onChange={(e) => updateUnlock(i, "role", e.target.value)}
                    placeholder="Role (e.g. HSE lead)"
                    className="rounded-xl"
                  />
                  <Input
                    value={u.co}
                    onChange={(e) => updateUnlock(i, "co", e.target.value)}
                    placeholder="Company (e.g. Sponsored)"
                    className="rounded-xl"
                  />
                  <Input
                    value={u.band}
                    onChange={(e) => updateUnlock(i, "band", e.target.value)}
                    placeholder="Tier / band (e.g. Gold)"
                    className="rounded-xl"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-xl border-[var(--v2-ink-200)] text-red-600 hover:bg-red-50"
                  onClick={() => removeUnlock(i)}
                  aria-label={`Remove tier ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Catalog controls */}
        <section className="v2-acard v2-org-card">
          <h2 className="v2-org-section-label" style={{ marginBottom: 12 }}>
            Catalog controls
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="t-sort">Sort order</Label>
              <Input
                id="t-sort"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-xs text-[var(--v2-ink-500)]">
                Lower numbers appear first in the catalog.
              </p>
            </div>
            <div className="grid content-start gap-2">
              <Label>Flags</Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--v2-ink-300)]"
                />
                Live in catalog
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--v2-ink-300)]"
                />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isNew}
                  onChange={(e) => setIsNew(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--v2-ink-300)]"
                />
                Marked new
              </label>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => router.push("/admin/trainings")}
            disabled={submitting}
          >
            Cancel
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
                ? "Create training"
                : "Save changes"}
          </Button>
        </div>
      </div>
    </>
  );
}
