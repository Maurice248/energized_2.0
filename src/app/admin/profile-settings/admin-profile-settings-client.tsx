"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { inferRouterOutputs } from "@trpc/server";
import { Bell, Bot, ImageIcon, Loader2, Save, User } from "lucide-react";
import { toast } from "sonner";
import type { AppRouter } from "@/server/api/root";
import { authClient } from "@/lib/auth/client";
import { api } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

type Row = inferRouterOutputs<AppRouter>["admin"]["profileSettings"]["get"];

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_ACCEPT = ["image/jpeg", "image/png", "image/webp"] as const;

function validateAvatarClient(file: File): string | null {
  if (!AVATAR_ACCEPT.includes(file.type as (typeof AVATAR_ACCEPT)[number])) {
    return "Use a PNG, JPG, or WEBP image.";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "Image must be 5MB or smaller.";
  }
  return null;
}

export function AdminProfileSettingsClient() {
  const { data, isLoading, isError, error, refetch } =
    api.admin.profileSettings.get.useQuery();

  if (isLoading || !data) {
    return (
      <div className="v2-settings-loading" aria-busy>
        <Loader2 className="h-8 w-8 animate-spin text-[var(--v2-accent)]" />
        <p style={{ marginTop: 12 }}>Loading settings…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <p className="v2-settings-field-hint" role="alert">
        {error.message ?? "Could not load profile settings."}
      </p>
    );
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <AdminProfileSettingsForm key={data.syncKey} row={data} refetch={refetch} />
    </>
  );
}

function AdminProfileSettingsForm({
  row,
  refetch,
}: {
  row: Row;
  refetch: () => Promise<unknown>;
}) {
  const router = useRouter();
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const updatePrefs = api.admin.profileSettings.updatePrefs.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const [name, setName] = useState(row.name);
  const [email, setEmail] = useState(row.email);
  const [phone, setPhone] = useState(row.phone ?? "");
  const [emailNotifications, setEmailNotifications] = useState(row.emailNotifications);
  const [pushNotifications, setPushNotifications] = useState(row.pushNotifications);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(row.image);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const pickFile = useCallback((file: File | null) => {
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(row.image);
      return;
    }
    const msg = validateAvatarClient(file);
    if (msg) {
      toast.error(msg);
      return;
    }
    setAvatarFile(file);
    setAvatarPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, [row.image]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) pickFile(f);
    },
    [pickFile],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nameTrim = name.trim();
    const emailTrim = email.trim().toLowerCase();
    if (!nameTrim || !emailTrim) {
      toast.error("Name and email are required.");
      return;
    }

    setSaving(true);
    try {
      if (avatarFile) {
        const fd = new FormData();
        fd.append("file", avatarFile);
        const res = await fetch("/api/upload/admin-profile-settings-avatar", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            body?.error === "too_large"
              ? "Image must be 5MB or smaller."
              : body?.error === "bad_mime"
                ? "Use a PNG, JPG, or WEBP image."
                : "Avatar upload failed.",
          );
        }
        const body = (await res.json()) as { url: string };
        setAvatarFile(null);
        setAvatarPreview(body.url);
      }

      if (nameTrim !== row.name.trim()) {
        const { error: err } = await authClient.updateUser({ name: nameTrim });
        if (err) throw new Error(err.message ?? "Could not update name.");
      }

      if (emailTrim !== row.email.trim().toLowerCase()) {
        const { error: err } = await authClient.changeEmail({
          newEmail: emailTrim,
        });
        if (err) throw new Error(err.message ?? "Could not start email change.");
        toast.message("Confirm email change", {
          description: `We sent a link to ${row.email} to approve ${emailTrim}.`,
        });
      }

      await updatePrefs.mutateAsync({
        phone: phone.trim() === "" ? null : phone.trim(),
        emailNotifications,
        pushNotifications,
      });

      toast.success("Profile settings saved.");
      router.refresh();
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = name.trim().length > 0 && email.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="v2-settings-shell v2-profile-settings-form"
    >
      <div className="v2-settings-panel">
        <section
          className="v2-settings-section"
          style={{
            paddingBottom: 28,
            borderBottom: "1px solid var(--v2-ink-200)",
          }}
        >
          <div className="v2-settings-section-head" style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="v2-aprefs-icon-slot v2-aprefs-icon-slot--user">
                <User className="h-5 w-5" aria-hidden />
              </span>
              <h2>Personal Information</h2>
            </div>
          </div>

          <div className="v2-settings-fields">
            <div className="v2-settings-field">
              <Label htmlFor={inputId} className="text-sm font-semibold">
                Profile Avatar
              </Label>
              <input
                ref={fileRef}
                id={inputId}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="sr-only"
                onChange={(ev) => pickFile(ev.target.files?.[0] ?? null)}
              />
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  "v2-profile-avatar-zone",
                  dragOver && "v2-profile-avatar-zone--active",
                )}
                data-drag={dragOver ? "true" : "false"}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    fileRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                {avatarPreview ? (
                  <div className="v2-profile-avatar-preview-wrap">
                    {/* Avatar sources include blob: previews and arbitrary HTTPS URLs (OAuth, Blob). */}
                    {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
                    <img
                      src={avatarPreview}
                      alt=""
                      width={96}
                      height={96}
                      className="v2-profile-avatar-preview-img"
                    />
                    <p className="v2-profile-avatar-zone-text">
                      Click or drop to replace
                    </p>
                    <p className="v2-profile-avatar-zone-sub">
                      PNG, JPG, WEBP (max 5MB)
                    </p>
                  </div>
                ) : (
                  <>
                    <ImageIcon
                      className="mx-auto mb-3 h-10 w-10 text-[var(--v2-accent)]"
                      aria-hidden
                    />
                    <p className="v2-profile-avatar-zone-text">
                      Click to upload or drag and drop
                    </p>
                    <p className="v2-profile-avatar-zone-sub">
                      <em>PNG, JPG, WEBP (max 5MB)</em>
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="v2-settings-fields-grid">
              <div className="v2-settings-field">
                <Label htmlFor="admin-profile-name" className="text-sm font-semibold">
                  Full Name <span className="text-[var(--v2-coral)]">*</span>
                </Label>
                <Input
                  id="admin-profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="h-11 rounded-xl border-[var(--v2-ink-200)]"
                  required
                />
              </div>
              <div className="v2-settings-field">
                <div className="v2-settings-field-label-row">
                  <Label
                    htmlFor="admin-profile-email"
                    className="text-sm font-semibold"
                  >
                    Email <span className="text-[var(--v2-coral)]">*</span>
                  </Label>
                  <Bot
                    className="h-4 w-4 shrink-0 text-[var(--v2-accent-deep)]"
                    aria-hidden
                  />
                </div>
                <Input
                  id="admin-profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="h-11 rounded-xl border-[var(--v2-ink-200)]"
                  required
                />
                <p className="v2-settings-field-hint">
                  Changing your email sends a confirmation link to your current address.
                </p>
              </div>
              <div className="v2-settings-field">
                <Label htmlFor="admin-profile-phone" className="text-sm font-semibold">
                  Phone
                </Label>
                <Input
                  id="admin-profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  autoComplete="tel"
                  className="h-11 rounded-xl border-[var(--v2-ink-200)]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="v2-settings-section" style={{ paddingTop: 28 }}>
          <div className="v2-settings-section-head" style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="v2-aprefs-icon-slot v2-aprefs-icon-slot--bell">
                <Bell className="h-5 w-5" aria-hidden />
              </span>
              <h2>Notification Preferences</h2>
            </div>
          </div>
          <div className="v2-settings-fields">
            <label className="v2-settings-check">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              <div>
                <strong>Email Notifications</strong>
                <p className="v2-settings-field-hint">
                  Product and admin alerts sent to your Energized inbox.
                </p>
              </div>
            </label>
            <label className="v2-settings-check">
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
              />
              <div>
                <strong>Push Notifications</strong>
                <p className="v2-settings-field-hint">
                  Stored for when browser push is enabled for admin accounts.
                </p>
              </div>
            </label>
          </div>
        </section>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          padding: "16px 22px",
          borderTop: "1px solid var(--v2-ink-200)",
          background: "var(--v2-ink-50)",
        }}
      >
        <button
          type="submit"
          disabled={saving || !canSave}
          className="v2-btn v2-btn-primary"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Save className="h-5 w-5" aria-hidden />
          )}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
