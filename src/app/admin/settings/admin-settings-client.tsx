"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import {
  Bell,
  Globe,
  HardDrive,
  Mail,
  Puzzle,
  RotateCcw,
  Save,
  Share2,
  Shield,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { AppRouter } from "@/server/api/root";
import type { AdminSettingsDigest } from "@/lib/admin-settings-digest";
import type { PlatformSettingsUpdateInput } from "@/server/api/routers/admin-settings";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/shared/icon";
import { SectionCard } from "../_components/section-card";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SettingsRow = RouterOutputs["admin"]["settings"]["get"];

type TabId =
  | "general"
  | "features"
  | "security"
  | "email"
  | "notifications"
  | "integrations"
  | "social"
  | "deployment";

const TAB_META: Array<{
  id: TabId;
  label: string;
  icon: typeof Globe;
  count?: number;
}> = [
  { id: "general", label: "General", icon: Globe, count: 5 },
  { id: "features", label: "Features", icon: Zap, count: 3 },
  { id: "security", label: "Security", icon: Shield, count: 4 },
  { id: "email", label: "Email", icon: Mail, count: 3 },
  { id: "notifications", label: "Notifications", icon: Bell, count: 2 },
  { id: "integrations", label: "Integrations", icon: Puzzle, count: 3 },
  { id: "social", label: "Social", icon: Share2 },
  { id: "deployment", label: "Deployment", icon: HardDrive },
];

const SOCIAL_ICON_OPTIONS = [
  "linkedin",
  "twitter",
  "facebook",
  "instagram",
  "youtube",
  "github",
  "other",
] as const;

function rowToPayload(row: SettingsRow): PlatformSettingsUpdateInput {
  const fallbackDescription = "Job search platform for Canada's energy sector.";
  return {
    siteName: row.siteName,
    siteDescription:
      row.siteDescription && row.siteDescription.trim().length > 0
        ? row.siteDescription
        : fallbackDescription,
    siteEmail: row.siteEmail ?? "",
    sitePhone: row.sitePhone ?? "",
    siteAddress: row.siteAddress ?? "",
    siteLogo: row.siteLogo ?? "",
    siteFavicon: row.siteFavicon ?? "",
    maintenanceMode: row.maintenanceMode,
    allowRegistration: row.allowRegistration,
    requireEmailVerification: row.requireEmailVerification,
    passwordMinLength: row.passwordMinLength,
    sessionTimeoutHours: row.sessionTimeoutHours,
    maxLoginAttempts: row.maxLoginAttempts,
    lockoutDurationMinutes: row.lockoutDurationMinutes,
    emailFromName: row.emailFromName ?? "",
    emailFromAddress: row.emailFromAddress ?? "",
    emailReplyTo: row.emailReplyTo ?? "",
    adminNotificationEmail: row.adminNotificationEmail ?? "",
    enableSms: row.enableSms,
    googleAnalyticsId: row.googleAnalyticsId ?? "",
    stripePublishableKey: row.stripePublishableKey ?? "",
    socialLinks: Array.isArray(row.socialLinks) ? row.socialLinks : [],
  };
}

function BadgePublic() {
  return <span className="v2-settings-field-badge">Public</span>;
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="v2-settings-field-hint">{children}</p>;
}

export function AdminSettingsClient({ digest }: { digest: AdminSettingsDigest }) {
  const { data, isLoading, isError, error } = api.admin.settings.get.useQuery();

  if (isLoading || !data) {
    return (
      <>
        <Toaster />
        <header className="v2-ahead">
          <div>
            <span className="v2-eyebrow">Configuration</span>
            <h1>
              Site <em>settings.</em>
            </h1>
            <p className="v2-ahead-sub">Loading workspace preferences…</p>
          </div>
        </header>
        <div className="v2-settings-loading" aria-busy>
          <div className="v2-settings-spinner" />
          <p>Loading settings…</p>
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Toaster />
        <header className="v2-ahead">
          <div>
            <span className="v2-eyebrow">Configuration</span>
            <h1>
              Site <em>settings.</em>
            </h1>
            <p className="v2-ahead-sub">
              {error.message}. Run migration <code className="text-xs">pnpm db:migrate</code> if this is a fresh deploy.
            </p>
          </div>
        </header>
      </>
    );
  }

  return (
    <>
      <Toaster />
      <SettingsEditor
        key={`${data.id}-${data.updatedAt.toISOString()}`}
        digest={digest}
        initial={rowToPayload(data)}
      />
    </>
  );
}

function SettingsEditor({
  digest,
  initial,
}: {
  digest: AdminSettingsDigest;
  initial: PlatformSettingsUpdateInput;
}) {
  const utils = api.useUtils();
  const [tab, setTab] = useState<TabId>("general");
  const [form, setForm] = useState(initial);

  const updateMut = api.admin.settings.update.useMutation({
    onSuccess: async () => {
      toast.success("Settings saved.");
      await Promise.all([
        utils.admin.settings.get.invalidate(),
        utils.admin.pages.getContactEmail.invalidate(),
      ]);
    },
    onError: (e) => toast.error(e.message || "Save failed."),
  });

  const resetMut = api.admin.settings.resetToDefaults.useMutation({
    onSuccess: async () => {
      toast.success("Restored factory defaults.");
      await Promise.all([
        utils.admin.settings.get.invalidate(),
        utils.admin.pages.getContactEmail.invalidate(),
      ]);
    },
    onError: (e) => toast.error(e.message || "Reset failed."),
  });

  const sortedSocial = useMemo(
    () => [...form.socialLinks].sort((a, b) => a.order - b.order),
    [form.socialLinks],
  );

  const [socialOpen, setSocialOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [draftIcon, setDraftIcon] = useState<(typeof SOCIAL_ICON_OPTIONS)[number]>("linkedin");
  const [draftActive, setDraftActive] = useState(true);

  function patch<K extends keyof PlatformSettingsUpdateInput>(key: K, value: PlatformSettingsUpdateInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openAddSocial() {
    setEditId(null);
    setDraftName("");
    setDraftUrl("");
    setDraftIcon("linkedin");
    setDraftActive(true);
    setSocialOpen(true);
  }

  function openEditSocial(id: string) {
    const link = form.socialLinks.find((s) => s.id === id);
    if (!link) return;
    setEditId(id);
    setDraftName(link.name);
    setDraftUrl(link.url);
    setDraftIcon(
      (SOCIAL_ICON_OPTIONS.find((i) => i === link.icon) ?? "other") as (typeof SOCIAL_ICON_OPTIONS)[number],
    );
    setDraftActive(link.isActive);
    setSocialOpen(true);
  }

  function saveSocialModal() {
    const name = draftName.trim();
    const url = draftUrl.trim();
    if (!name || !url) {
      toast.error("Name and URL are required.");
      return;
    }
    if (!URL.canParse(url)) {
      toast.error("Enter a valid URL (including https://).");
      return;
    }

    if (editId) {
      patch(
        "socialLinks",
        form.socialLinks.map((s) =>
          s.id === editId ? { ...s, name, url, icon: draftIcon, isActive: draftActive } : s,
        ),
      );
    } else {
      const nextOrder =
        form.socialLinks.length === 0 ? 1 : Math.max(...form.socialLinks.map((s) => s.order)) + 1;
      patch("socialLinks", [
        ...form.socialLinks,
        {
          id: crypto.randomUUID(),
          name,
          url,
          icon: draftIcon,
          order: nextOrder,
          isActive: draftActive,
        },
      ]);
    }
    setSocialOpen(false);
  }

  function toggleSocialActive(id: string) {
    patch(
      "socialLinks",
      form.socialLinks.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)),
    );
  }

  function removeSocial(id: string) {
    const link = form.socialLinks.find((s) => s.id === id);
    if (!link) return;
    if (!window.confirm(`Delete ${link.name}?`)) return;
    patch(
      "socialLinks",
      form.socialLinks.filter((s) => s.id !== id),
    );
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    await updateMut.mutateAsync(form);
  }

  function handleResetDefaults() {
    if (!window.confirm("Reset all platform settings to Energized defaults?")) return;
    resetMut.mutate();
  }

  const saving = updateMut.isPending || resetMut.isPending;

  return (
    <>
      <header className="v2-ahead" style={{ gridTemplateColumns: "1fr" }}>
        <div className="v2-settings-head">
          <div>
            <span className="v2-eyebrow">Configuration</span>
            <h1>
              Site <em>settings.</em>
            </h1>
            <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
              Same hub layout as Greenopia — general branding, feature switches, mail identity, integrations, and social links — persisted in Postgres. Secrets and price IDs still ship via <strong>Deployment</strong> env vars (Vercel / Neon).
            </p>
          </div>
          <div className="v2-settings-actions">
            <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={handleResetDefaults} disabled={saving}>
              <RotateCcw size={16} aria-hidden />
              Initialize defaults
            </button>
            <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => void handleSave()} disabled={saving}>
              <Save size={16} aria-hidden />
              Save changes
            </button>
          </div>
        </div>
      </header>

      <div className="v2-settings-shell">
        <div className="v2-settings-tabbar" role="tablist" aria-label="Settings sections">
          {TAB_META.map((t) => {
            const IconC = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn("v2-settings-tab", active && "active")}
                onClick={() => setTab(t.id)}
              >
                <IconC size={16} aria-hidden />
                {t.label}
                {t.count !== undefined ? <span className="v2-settings-tab-count">({t.count})</span> : null}
              </button>
            );
          })}
        </div>

        <form className="v2-settings-panel" onSubmit={(e) => void handleSave(e)}>
          {tab === "general" && (
            <section className="v2-settings-section" aria-labelledby="settings-general">
              <div className="v2-settings-section-head">
                <Globe size={18} aria-hidden />
                <h2 id="settings-general">General settings</h2>
                <span>Basic platform configuration and branding</span>
              </div>

              <div className="v2-settings-fields">
                <div className="v2-settings-field">
                  <div className="v2-settings-field-label-row">
                    <Label>
                      Name <span className="text-red-600">*</span>
                    </Label>
                    <BadgePublic />
                  </div>
                  <FieldHint>Public name shown in admin copy and transactional emails.</FieldHint>
                  <Input required value={form.siteName} onChange={(e) => patch("siteName", e.target.value)} />
                </div>

                <div className="v2-settings-field">
                  <div className="v2-settings-field-label-row">
                    <Label>
                      Description <span className="text-red-600">*</span>
                    </Label>
                    <BadgePublic />
                  </div>
                  <FieldHint>Short positioning statement for SEO snippets and internal docs.</FieldHint>
                  <Input
                    required
                    value={form.siteDescription ?? ""}
                    onChange={(e) => patch("siteDescription", e.target.value)}
                  />
                </div>

                <div className="v2-settings-field">
                  <div className="v2-settings-field-label-row">
                    <Label>Logo URL</Label>
                    <BadgePublic />
                  </div>
                  <FieldHint>HTTPS URL to a PNG/SVG lockup (transparent background recommended).</FieldHint>
                  <Input
                    placeholder="https://"
                    value={form.siteLogo ?? ""}
                    onChange={(e) => patch("siteLogo", e.target.value)}
                  />
                </div>

                <div className="v2-settings-field">
                  <div className="v2-settings-field-label-row">
                    <Label>Favicon URL</Label>
                    <BadgePublic />
                  </div>
                  <FieldHint>Square mark (.png or .ico), typically 32×32.</FieldHint>
                  <Input
                    placeholder="https://"
                    value={form.siteFavicon ?? ""}
                    onChange={(e) => patch("siteFavicon", e.target.value)}
                  />
                </div>

                <div className="v2-settings-field">
                  <div className="v2-settings-field-label-row">
                    <Label>
                      Contact email <span className="text-red-600">*</span>
                    </Label>
                    <BadgePublic />
                  </div>
                  <FieldHint>Primary inbox for employer escalations surfaced on marketing pages.</FieldHint>
                  <Input
                    type="email"
                    required
                    value={form.siteEmail}
                    onChange={(e) => patch("siteEmail", e.target.value)}
                  />
                </div>
              </div>
            </section>
          )}

          {tab === "features" && (
            <section className="v2-settings-section" aria-labelledby="settings-features">
              <div className="v2-settings-section-head">
                <Zap size={18} aria-hidden />
                <h2 id="settings-features">Features</h2>
                <span>Toggle macro behaviours — wire-up to middleware/auth separately.</span>
              </div>
              <div className="v2-settings-fields">
                <label className="v2-settings-check">
                  <input
                    type="checkbox"
                    checked={form.maintenanceMode}
                    onChange={(e) => patch("maintenanceMode", e.target.checked)}
                  />
                  <div>
                    <strong>Maintenance mode</strong>
                    <FieldHint>When enabled, plan a branded holding response at the edge.</FieldHint>
                  </div>
                </label>
                <label className="v2-settings-check">
                  <input
                    type="checkbox"
                    checked={form.allowRegistration}
                    onChange={(e) => patch("allowRegistration", e.target.checked)}
                  />
                  <div>
                    <strong>Allow registrations</strong>
                    <BadgePublic />
                    <FieldHint>Flip off to pause new candidate/employer intake.</FieldHint>
                  </div>
                </label>
                <label className="v2-settings-check">
                  <input
                    type="checkbox"
                    checked={form.requireEmailVerification}
                    onChange={(e) => patch("requireEmailVerification", e.target.checked)}
                  />
                  <div>
                    <strong>Require email verification</strong>
                    <FieldHint>Aligns with Better Auth policy — mirror here for operator clarity.</FieldHint>
                  </div>
                </label>
              </div>
            </section>
          )}

          {tab === "security" && (
            <section className="v2-settings-section" aria-labelledby="settings-security">
              <div className="v2-settings-section-head">
                <Shield size={18} aria-hidden />
                <h2 id="settings-security">Security</h2>
                <span>Documented targets — Better Auth remains the enforcement layer.</span>
              </div>
              <div className="v2-settings-fields v2-settings-fields-grid">
                <div className="v2-settings-field">
                  <Label>Password min length</Label>
                  <Input
                    type="number"
                    min={6}
                    max={128}
                    value={form.passwordMinLength}
                    onChange={(e) => patch("passwordMinLength", Number.parseInt(e.target.value, 10) || 8)}
                  />
                </div>
                <div className="v2-settings-field">
                  <Label>Session timeout (hours)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.sessionTimeoutHours}
                    onChange={(e) => patch("sessionTimeoutHours", Number.parseInt(e.target.value, 10) || 24)}
                  />
                </div>
                <div className="v2-settings-field">
                  <Label>Max login attempts</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.maxLoginAttempts}
                    onChange={(e) => patch("maxLoginAttempts", Number.parseInt(e.target.value, 10) || 5)}
                  />
                </div>
                <div className="v2-settings-field">
                  <Label>Lockout duration (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.lockoutDurationMinutes}
                    onChange={(e) =>
                      patch("lockoutDurationMinutes", Number.parseInt(e.target.value, 10) || 30)
                    }
                  />
                </div>
              </div>
            </section>
          )}

          {tab === "email" && (
            <section className="v2-settings-section" aria-labelledby="settings-email">
              <div className="v2-settings-section-head">
                <Mail size={18} aria-hidden />
                <h2 id="settings-email">Email</h2>
                <span>Overrides marketing tone — Resend still sends from verified domains.</span>
              </div>
              <div className="v2-settings-fields">
                <div className="v2-settings-field">
                  <Label>From name</Label>
                  <Input value={form.emailFromName} onChange={(e) => patch("emailFromName", e.target.value)} />
                </div>
                <div className="v2-settings-field">
                  <Label>From address</Label>
                  <Input
                    type="email"
                    value={form.emailFromAddress}
                    onChange={(e) => patch("emailFromAddress", e.target.value)}
                  />
                </div>
                <div className="v2-settings-field">
                  <Label>Reply to</Label>
                  <Input
                    type="email"
                    placeholder="Optional"
                    value={form.emailReplyTo ?? ""}
                    onChange={(e) => patch("emailReplyTo", e.target.value)}
                  />
                </div>
              </div>
            </section>
          )}

          {tab === "notifications" && (
            <section className="v2-settings-section" aria-labelledby="settings-notifications">
              <div className="v2-settings-section-head">
                <Bell size={18} aria-hidden />
                <h2 id="settings-notifications">Notifications</h2>
                <span>Routing hints for internal alerting workflows.</span>
              </div>
              <div className="v2-settings-fields">
                <div className="v2-settings-field">
                  <Label>Admin notification email</Label>
                  <Input
                    type="email"
                    placeholder="Optional"
                    value={form.adminNotificationEmail ?? ""}
                    onChange={(e) => patch("adminNotificationEmail", e.target.value)}
                  />
                </div>
                <label className="v2-settings-check">
                  <input
                    type="checkbox"
                    checked={form.enableSms}
                    onChange={(e) => patch("enableSms", e.target.checked)}
                  />
                  <div>
                    <strong>Enable SMS</strong>
                    <FieldHint>Placeholder — wire a carrier before enabling in production.</FieldHint>
                  </div>
                </label>
              </div>
            </section>
          )}

          {tab === "integrations" && (
            <section className="v2-settings-section" aria-labelledby="settings-integrations">
              <div className="v2-settings-section-head">
                <Puzzle size={18} aria-hidden />
                <h2 id="settings-integrations">Integrations</h2>
                <span>Analytics keys + Stripe publishable references.</span>
              </div>

              <div className="v2-settings-callout">
                <strong>Live PostHog wiring</strong> comes from env ({digest.analytics.posthogHost}). Browser capture{" "}
                {digest.analytics.posthogBrowser ? "is on" : "is off"}; server enrichment{" "}
                {digest.analytics.posthogProjectApiConfigured ? "hydrated" : "optional"}.
              </div>

              <div className="v2-settings-fields">
                <div className="v2-settings-field">
                  <div className="v2-settings-field-label-row">
                    <Label>Google Analytics measurement ID</Label>
                    <BadgePublic />
                  </div>
                  <FieldHint>Optional legacy GA4 hook — Energized primarily uses PostHog.</FieldHint>
                  <Input
                    placeholder="G-XXXXXXX"
                    value={form.googleAnalyticsId ?? ""}
                    onChange={(e) => patch("googleAnalyticsId", e.target.value)}
                  />
                </div>
                <div className="v2-settings-field">
                  <div className="v2-settings-field-label-row">
                    <Label>Stripe publishable key</Label>
                    <BadgePublic />
                  </div>
                  <FieldHint>
                    Mirror of <code className="text-xs">pk_live_…</code> — checkout still depends on server secrets.
                  </FieldHint>
                  <Input
                    placeholder="pk_live_…"
                    value={form.stripePublishableKey ?? ""}
                    onChange={(e) => patch("stripePublishableKey", e.target.value)}
                  />
                </div>
                <div className="v2-settings-field">
                  <Label className="text-muted-foreground">PostHog ingest host (read-only)</Label>
                  <Input readOnly value={digest.analytics.posthogHost} className="opacity-80" />
                </div>
              </div>
            </section>
          )}

          {tab === "social" && (
            <section className="v2-settings-section" aria-labelledby="settings-social">
              <div className="v2-settings-social-head">
                <div className="v2-settings-section-head" style={{ marginBottom: 0 }}>
                  <Share2 size={18} aria-hidden />
                  <h2 id="settings-social">Social media links</h2>
                </div>
                <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={openAddSocial}>
                  <Share2 size={14} aria-hidden />
                  Add link
                </button>
              </div>

              {sortedSocial.length === 0 ? (
                <p className="v2-settings-empty">No social profiles yet — add LinkedIn or X for recruiter trust.</p>
              ) : (
                <ul className="v2-settings-social-list">
                  {sortedSocial.map((link) => (
                    <li key={link.id} className="v2-settings-social-row">
                      <div>
                        <div className="v2-settings-social-title">
                          <strong>{link.name}</strong>
                          <span className={cn("v2-settings-pill", link.isActive ? "live" : "off")}>
                            {link.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="v2-settings-social-url">{link.url}</p>
                        <p className="v2-settings-social-meta">Icon token · {link.icon}</p>
                      </div>
                      <div className="v2-settings-social-actions">
                        <button type="button" className="v2-acard-link" onClick={() => openEditSocial(link.id)}>
                          Edit
                        </button>
                        <button type="button" className="v2-acard-link" onClick={() => toggleSocialActive(link.id)}>
                          {link.isActive ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          className="v2-acard-link"
                          style={{ color: "var(--v2-coral)" }}
                          onClick={() => removeSocial(link.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "deployment" && (
            <section className="v2-settings-section" aria-labelledby="settings-deployment">
              <div className="v2-settings-section-head">
                <HardDrive size={18} aria-hidden />
                <h2 id="settings-deployment">Deployment digest</h2>
                <span>Read-only snapshot from validated env — redeploy to change.</span>
              </div>

              <div className="v2-settings-deployment-grid">
                <SectionCard
                  title={
                    <>
                      Origins &amp; <em>sessions.</em>
                    </>
                  }
                  action={
                    <Link href="/admin/system" className="v2-acard-link">
                      System health <Icon name="chevronRight" size={12} />
                    </Link>
                  }
                >
                  <DeploymentRow label="NEXT_PUBLIC_APP_URL" value={digest.deployment.appUrl} />
                  <DeploymentRow label="BETTER_AUTH_URL" value={digest.deployment.authUrl} />
                </SectionCard>

                <SectionCard title={<>AI &amp; <em>safety.</em></>}>
                  <DeploymentRow label="OPENAI_MODEL" value={digest.ai.model} />
                  <DeploymentRow
                    label="OPENAI_API_KEY"
                    value={digest.ai.apiKeyConfigured ? "Configured" : "Not set"}
                  />
                </SectionCard>

                <SectionCard
                  title={<>Employer <em>billing.</em></>}
                  action={
                    <Link href="/admin/billing" className="v2-acard-link">
                      Billing <Icon name="chevronRight" size={12} />
                    </Link>
                  }
                >
                  <DeploymentRow
                    label="Stripe secret"
                    value={digest.stripe.secretConfigured ? "Loaded" : "Missing"}
                  />
                  <DeploymentRow
                    label="Webhook verifier"
                    value={digest.stripe.webhookConfigured ? "Ready" : "Missing"}
                  />
                  <DeploymentRow
                    label="Price IDs"
                    value={`${digest.stripe.priceIdsConfiguredCount} / ${digest.stripe.priceIdsConfiguredMax}`}
                  />
                </SectionCard>
              </div>
            </section>
          )}
        </form>
      </div>

      <Dialog open={socialOpen} onOpenChange={setSocialOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit social link" : "Add social link"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label>Name</Label>
              <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="LinkedIn" />
            </div>
            <div className="grid gap-1">
              <Label>URL</Label>
              <Input value={draftUrl} onChange={(e) => setDraftUrl(e.target.value)} placeholder="https://" />
            </div>
            <div className="grid gap-1">
              <Label>Icon</Label>
              <select
                className="v2-settings-select"
                value={draftIcon}
                onChange={(e) => setDraftIcon(e.target.value as (typeof SOCIAL_ICON_OPTIONS)[number])}
              >
                {SOCIAL_ICON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <label className="v2-settings-check">
              <input
                type="checkbox"
                checked={draftActive}
                onChange={(e) => setDraftActive(e.target.checked)}
              />
              <strong>Active</strong>
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setSocialOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveSocialModal}>
              Save link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeploymentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="v2-settings-deploy-row">
      <span className="v2-settings-deploy-k">{label}</span>
      <span className="v2-settings-deploy-v">{value}</span>
    </div>
  );
}
