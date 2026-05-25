"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ResumeAutofillDraft,
  ResumeAutofillDraftCertRow,
  ResumeAutofillDraftEducationRow,
  ResumeAutofillDraftWorkRow,
  ResumeCertTypeValue,
  ResumeSectorValue,
} from "@/lib/resume-extraction-map";
import { Icon } from "@/components/shared/icon";

const SECTORS: { value: ResumeSectorValue | ""; label: string }[] = [
  { value: "", label: "Sector (optional)" },
  { value: "oil_gas", label: "Oil & Gas" },
  { value: "renewables", label: "Renewables" },
  { value: "nuclear", label: "Nuclear" },
  { value: "utilities", label: "Utilities" },
  { value: "hydrogen", label: "Hydrogen" },
  { value: "power", label: "Power" },
  { value: "other", label: "Other" },
];

const CERT_TYPES: { value: ResumeCertTypeValue; label: string }[] = [
  { value: "h2s_alive", label: "H2S Alive" },
  { value: "first_aid", label: "First Aid / CPR" },
  { value: "csts", label: "CSTS" },
  { value: "red_seal", label: "Red Seal" },
  { value: "p_eng", label: "P.Eng" },
  { value: "nace", label: "NACE" },
  { value: "fall_protection", label: "Fall protection" },
  { value: "other", label: "Other" },
];

export type ResumeAutofillApplyPayload = {
  workHistory: Array<
    Omit<ResumeAutofillDraftWorkRow, "startedAt" | "endedAt"> & {
      startedAt: Date;
      endedAt: Date | null;
    }
  >;
  education: ResumeAutofillDraftEducationRow[];
  certifications: Array<
    Omit<ResumeAutofillDraftCertRow, "issuedAt" | "expiresAt"> & {
      issuedAt: Date | null;
      expiresAt: Date | null;
    }
  >;
  mergeCoreSkills?: string[];
};

function padDateForLocalNoon(isoYmd: string): Date {
  return new Date(`${isoYmd}T12:00:00`);
}

function coreSkillsToText(skills: string[]): string {
  return skills.join("\n");
}

function textToCoreSkills(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(/[\n,]+/)) {
    const t = part.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t.slice(0, 60));
    if (out.length >= 30) break;
  }
  return out;
}

export function ResumeAutofillModal({
  open,
  onOpenChange,
  draft,
  applying,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ResumeAutofillDraft | null;
  applying: boolean;
  onApply: (payload: ResumeAutofillApplyPayload) => Promise<void>;
}) {
  const [work, setWork] = useState<ResumeAutofillDraftWorkRow[]>(() =>
    draft
      ? draft.workHistory.map((w) => ({
          ...w,
          skills: [...w.skills],
        }))
      : [],
  );
  const [edu, setEdu] = useState<ResumeAutofillDraftEducationRow[]>(() =>
    draft ? draft.education.map((e) => ({ ...e })) : [],
  );
  const [certs, setCerts] = useState<ResumeAutofillDraftCertRow[]>(() =>
    draft ? draft.certifications.map((c) => ({ ...c })) : [],
  );
  const [skillsText, setSkillsText] = useState(() =>
    draft ? coreSkillsToText(draft.coreSkills) : "",
  );

  const close = () => onOpenChange(false);

  const submit = async () => {
    const workHistory = work
      .filter((w) => w.employerName.trim() && w.roleTitle.trim() && w.startedAt)
      .map((w) => ({
        employerName: w.employerName.trim(),
        roleTitle: w.roleTitle.trim(),
        site: w.site?.trim() || null,
        sector: w.sector,
        commodity: w.commodity?.trim() || null,
        rotation: w.rotation?.trim() || null,
        summary: w.summary?.trim() || null,
        skills: w.skills
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 20),
        startedAt: padDateForLocalNoon(w.startedAt),
        endedAt: w.endedAt ? padDateForLocalNoon(w.endedAt) : null,
      }));

    const education = edu
      .filter((e) => e.school.trim())
      .map((e) => ({
        school: e.school.trim(),
        degree: e.degree?.trim() || null,
        startedYear: e.startedYear?.trim().match(/^\d{4}$/) ? e.startedYear.trim() : null,
        endedYear: e.endedYear?.trim().match(/^\d{4}$/) ? e.endedYear.trim() : null,
        details: e.details?.trim() || null,
      }));

    const certifications = certs
      .filter((c) => c.name.trim())
      .map((c) => ({
        type: c.type,
        name: c.name.trim(),
        issuer: c.issuer?.trim() || null,
        credentialId: null,
        documentUrl: null,
        issuedAt: c.issuedAt ? padDateForLocalNoon(c.issuedAt) : null,
        expiresAt: c.expiresAt ? padDateForLocalNoon(c.expiresAt) : null,
      }));

    const mergeCoreSkills = textToCoreSkills(skillsText);

    await onApply({
      workHistory,
      education,
      certifications,
      mergeCoreSkills: mergeCoreSkills.length > 0 ? mergeCoreSkills : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(90vh,800px)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="border-b bg-muted/40 px-4 py-3">
          <DialogTitle className="pr-8">Auto-fill from resume?</DialogTitle>
          <DialogDescription>
            We scanned your upload and pulled out work history, education,
            certifications, and core skills. Review and edit anything before
            adding it to your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {work.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Work history
              </h3>
              {work.map((row, i) => (
                <div
                  key={`w-${i}`}
                  className="space-y-2 rounded-lg border border-border bg-card/50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Role {i + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-destructive"
                      onClick={() => setWork((xs) => xs.filter((_, j) => j !== i))}
                    >
                      <Icon name="x" size={14} /> Remove
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Employer</Label>
                      <Input
                        value={row.employerName}
                        onChange={(e) =>
                          setWork((xs) =>
                            xs.map((r, j) =>
                              j === i ? { ...r, employerName: e.target.value } : r,
                            ),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={row.roleTitle}
                        onChange={(e) =>
                          setWork((xs) =>
                            xs.map((r, j) =>
                              j === i ? { ...r, roleTitle: e.target.value } : r,
                            ),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Site / location</Label>
                      <Input
                        value={row.site ?? ""}
                        onChange={(e) =>
                          setWork((xs) =>
                            xs.map((r, j) =>
                              j === i ? { ...r, site: e.target.value || null } : r,
                            ),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Sector</Label>
                      <select
                        className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                        value={row.sector ?? ""}
                        onChange={(e) =>
                          setWork((xs) =>
                            xs.map((r, j) =>
                              j === i
                                ? {
                                    ...r,
                                    sector: (e.target.value || null) as ResumeSectorValue | null,
                                  }
                                : r,
                            ),
                          )
                        }
                      >
                        {SECTORS.map((s) => (
                          <option key={s.label} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Start</Label>
                      <Input
                        type="date"
                        value={row.startedAt}
                        onChange={(e) =>
                          setWork((xs) =>
                            xs.map((r, j) =>
                              j === i ? { ...r, startedAt: e.target.value } : r,
                            ),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End (leave blank if current)</Label>
                      <Input
                        type="date"
                        value={row.endedAt ?? ""}
                        onChange={(e) =>
                          setWork((xs) =>
                            xs.map((r, j) =>
                              j === i
                                ? { ...r, endedAt: e.target.value || null }
                                : r,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Summary</Label>
                    <textarea
                      className="min-h-[72px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
                      value={row.summary ?? ""}
                      onChange={(e) =>
                        setWork((xs) =>
                          xs.map((r, j) =>
                            j === i ? { ...r, summary: e.target.value || null } : r,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Role skills (comma-separated)</Label>
                    <Input
                      value={row.skills.join(", ")}
                      onChange={(e) =>
                        setWork((xs) =>
                          xs.map((r, j) =>
                            j === i
                              ? {
                                  ...r,
                                  skills: e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                    .slice(0, 20),
                                }
                              : r,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </section>
          )}

          {edu.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Education</h3>
              {edu.map((row, i) => (
                <div
                  key={`e-${i}`}
                  className="space-y-2 rounded-lg border border-border bg-card/50 p-3"
                >
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-destructive"
                      onClick={() => setEdu((xs) => xs.filter((_, j) => j !== i))}
                    >
                      <Icon name="x" size={14} /> Remove
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label className="text-xs">School</Label>
                      <Input
                        value={row.school}
                        onChange={(e) =>
                          setEdu((xs) =>
                            xs.map((r, j) =>
                              j === i ? { ...r, school: e.target.value } : r,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Degree / program</Label>
                      <Input
                        value={row.degree ?? ""}
                        onChange={(e) =>
                          setEdu((xs) =>
                            xs.map((r, j) =>
                              j === i ? { ...r, degree: e.target.value || null } : r,
                            ),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Start year (YYYY)</Label>
                      <Input
                        value={row.startedYear ?? ""}
                        onChange={(e) =>
                          setEdu((xs) =>
                            xs.map((r, j) =>
                              j === i
                                ? { ...r, startedYear: e.target.value || null }
                                : r,
                            ),
                          )
                        }
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End year (YYYY)</Label>
                      <Input
                        value={row.endedYear ?? ""}
                        onChange={(e) =>
                          setEdu((xs) =>
                            xs.map((r, j) =>
                              j === i ? { ...r, endedYear: e.target.value || null } : r,
                            ),
                          )
                        }
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Details</Label>
                    <textarea
                      className="min-h-[56px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
                      value={row.details ?? ""}
                      onChange={(e) =>
                        setEdu((xs) =>
                          xs.map((r, j) =>
                            j === i ? { ...r, details: e.target.value || null } : r,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </section>
          )}

          {certs.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Certifications
              </h3>
              {certs.map((row, i) => (
                <div
                  key={`c-${i}`}
                  className="space-y-2 rounded-lg border border-border bg-card/50 p-3"
                >
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-destructive"
                      onClick={() => setCerts((xs) => xs.filter((_, j) => j !== i))}
                    >
                      <Icon name="x" size={14} /> Remove
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <select
                        className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                        value={row.type}
                        onChange={(e) =>
                          setCerts((xs) =>
                            xs.map((r, j) =>
                              j === i
                                ? { ...r, type: e.target.value as ResumeCertTypeValue }
                                : r,
                            ),
                          )
                        }
                      >
                        {CERT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={row.name}
                        onChange={(e) =>
                          setCerts((xs) =>
                            xs.map((r, j) =>
                              j === i ? { ...r, name: e.target.value } : r,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Issuer</Label>
                      <Input
                        value={row.issuer ?? ""}
                        onChange={(e) =>
                          setCerts((xs) =>
                            xs.map((r, j) =>
                              j === i ? { ...r, issuer: e.target.value || null } : r,
                            ),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Issued</Label>
                      <Input
                        type="date"
                        value={row.issuedAt ?? ""}
                        onChange={(e) =>
                          setCerts((xs) =>
                            xs.map((r, j) =>
                              j === i
                                ? { ...r, issuedAt: e.target.value || null }
                                : r,
                            ),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Expires</Label>
                      <Input
                        type="date"
                        value={row.expiresAt ?? ""}
                        onChange={(e) =>
                          setCerts((xs) =>
                            xs.map((r, j) =>
                              j === i
                                ? { ...r, expiresAt: e.target.value || null }
                                : r,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Core skills</h3>
            <p className="text-xs text-muted-foreground">
              One per line or comma-separated. These merge with skills already on
              your profile (max 30 total). Leave blank to skip updating skills.
            </p>
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
            />
          </section>
        </div>

        <DialogFooter className="border-t bg-muted/40">
          <Button type="button" variant="outline" disabled={applying} onClick={close}>
            No thanks
          </Button>
          <Button type="button" disabled={applying} onClick={() => void submit()}>
            {applying ? "Saving…" : "Auto-fill profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
