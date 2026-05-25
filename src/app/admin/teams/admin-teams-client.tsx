"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/trpc/client";
import { KpiCard } from "@/app/admin/_components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";

type StaffRow = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  emailVerified: boolean;
  phone: string | null;
  staffPosition: string | null;
  image: string | null;
  role: string;
};

type DialogMode =
  | "invite"
  | "edit"
  | "email"
  | "password"
  | "demote"
  | "promote"
  | "delete"
  | null;

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function fmtJoined(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
  }).format(new Date(d));
}

async function invalidateStaffQueries(utils: ReturnType<typeof api.useUtils>) {
  await Promise.all([
    utils.admin.teams.list.invalidate(),
    utils.admin.teams.stats.invalidate(),
    utils.admin.users.list.invalidate(),
    utils.admin.users.stats.invalidate(),
  ]);
}

export function AdminTeamsClient() {
  const utils = api.useUtils();

  const [searchDraft, setSearchDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchDraft.trim()), 300);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const listInput = useMemo(
    () => (debouncedSearch ? { search: debouncedSearch } : {}),
    [debouncedSearch],
  );

  const { data, isLoading, isError, error } =
    api.admin.teams.list.useQuery(listInput);

  const { data: stats, isLoading: statsLoading } =
    api.admin.teams.stats.useQuery();

  const [activeMember, setActiveMember] = useState<StaffRow | null>(null);
  const [dialog, setDialog] = useState<DialogMode>(null);

  const [inviteName, setInviteName] = useState("");
  const [invitePosition, setInvitePosition] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteConfirm, setInviteConfirm] = useState("");

  const [editName, setEditName] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [avatarUploadBusy, setAvatarUploadBusy] = useState(false);

  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const demoteMut = api.admin.teams.demote.useMutation({
    onSuccess: async () => {
      toast.success("Removed from platform admin team.");
      await invalidateStaffQueries(utils);
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const promoteMut = api.admin.teams.promoteByEmail.useMutation({
    onSuccess: async (res) => {
      if (res.alreadyAdmin) {
        toast.message("Already a platform admin.", {
          description: "Their role was not changed.",
        });
      } else {
        toast.success("Platform admin access granted.");
      }
      await invalidateStaffQueries(utils);
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyMut = api.admin.teams.markEmailVerified.useMutation({
    onSuccess: async (res) => {
      toast.success(
        res.changed ? "Email marked verified." : "Email was already verified.",
      );
      await invalidateStaffQueries(utils);
    },
    onError: (e) => toast.error(e.message),
  });

  const createMut = api.admin.users.create.useMutation({
    onSuccess: async () => {
      toast.success(
        "Teammate created. They can sign in immediately with the password you set.",
      );
      await invalidateStaffQueries(utils);
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = api.admin.users.update.useMutation({
    onSuccess: async () => {
      await invalidateStaffQueries(utils);
    },
    onError: (e) => toast.error(e.message),
  });

  const emailMut = api.admin.users.changeEmail.useMutation({
    onSuccess: async () => {
      toast.success("Email updated. They should confirm from their inbox.");
      await invalidateStaffQueries(utils);
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const passwordMut = api.admin.users.setPassword.useMutation({
    onSuccess: async () => {
      toast.success("Password saved.");
      await invalidateStaffQueries(utils);
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = api.admin.users.deleteUser.useMutation({
    onSuccess: async () => {
      toast.success("Account removed.");
      await invalidateStaffQueries(utils);
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  async function uploadStaffAvatarFile(file: File) {
    if (!activeMember) return;
    setAvatarUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append("userId", activeMember.id);
      fd.append("file", file);
      const res = await fetch("/api/upload/admin-staff-avatar", {
        method: "POST",
        body: fd,
      });
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      const err =
        body && typeof body === "object" && "error" in body
          ? String((body as { error: unknown }).error)
          : null;
      if (!res.ok) {
        toast.error(
          err === "too_large"
            ? "Image must be 2 MB or smaller."
            : err === "bad_mime"
              ? "Use JPEG, PNG, or WebP."
              : err ?? "Upload failed.",
        );
        return;
      }
      const url =
        body &&
        typeof body === "object" &&
        "url" in body &&
        typeof (body as { url: unknown }).url === "string"
          ? (body as { url: string }).url
          : "";
      if (url) setEditAvatarUrl(url);
      toast.success("Photo updated.");
      await invalidateStaffQueries(utils);
    } finally {
      setAvatarUploadBusy(false);
    }
  }

  function removeStaffAvatar() {
    if (!activeMember) return;
    updateMut.mutate(
      { userId: activeMember.id, image: null },
      {
        onSuccess: () => {
          setEditAvatarUrl(null);
          toast.success("Photo removed.");
        },
      },
    );
  }

  function closeDialog() {
    setDialog(null);
    setActiveMember(null);
    setInviteName("");
    setInvitePosition("");
    setInvitePhone("");
    setInviteEmail("");
    setInvitePassword("");
    setInviteConfirm("");
    setNewEmail("");
    setNewPassword("");
    setConfirmPassword("");
    setEditAvatarUrl(null);
  }

  function openFor(m: StaffRow, mode: DialogMode) {
    setActiveMember(m);
    setDialog(mode);
    if (mode === "edit") {
      setEditName(m.name);
      setEditPosition(m.staffPosition ?? "");
      setEditPhone(m.phone ?? "");
      setEditAvatarUrl(m.image ?? null);
    }
    if (mode === "email") {
      setNewEmail(m.email);
    }
  }

  const rows = useMemo(() => data?.members ?? [], [data?.members]);
  const currentUserId = data?.currentUserId;
  const platformAdminTotal = stats?.total ?? 0;
  const hasSearch = debouncedSearch.length > 0;

  return (
    <>
      <Toaster richColors position="top-center" />
      <header className="v2-ahead" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <span className="v2-eyebrow">Manage</span>
          <h1>
            Platform <em>team.</em>
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            Energized staff who can access this admin console — billing, content, verifications, and
            user data. Invite teammates here, or search below to grant admin access to an existing
            account.
          </p>
        </div>
      </header>

      <div className="v2-akpi-row v2-akpi-row--four" style={{ marginBottom: 24 }}>
        <KpiCard
          eyebrow="Staff seats"
          icon="users"
          value={statsLoading ? "—" : (stats?.total ?? 0).toLocaleString()}
          note="Platform admins"
        />
        <KpiCard
          eyebrow="Verified sign-in"
          icon="checkCircle"
          value={statsLoading ? "—" : (stats?.verified ?? 0).toLocaleString()}
          note="Email confirmed"
        />
        <KpiCard
          eyebrow="Pending email"
          icon="mail"
          value={
            statsLoading
              ? "—"
              : Math.max(
                  0,
                  (stats?.total ?? 0) - (stats?.verified ?? 0),
                ).toLocaleString()
          }
          note="Needs inbox confirmation"
        />
        <KpiCard
          eyebrow="New this month"
          icon="trendingUp"
          value={
            statsLoading ? "—" : (stats?.joinedLast30Days ?? 0).toLocaleString()
          }
          note="Joined last 30 days"
        />
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-3"
        style={{ marginBottom: 20 }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Input
            type="search"
            className="h-10 min-h-10 min-w-0 flex-1 basis-40 max-w-sm"
            placeholder="Search team, or any user (to grant admin)…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            aria-label="Search platform team"
          />
          <Button variant="outline" className="h-10 shrink-0" asChild>
            <Link href="/admin/users">All users</Link>
          </Button>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            className="v2-admin-users-add-btn h-10 min-w-[10rem] shrink-0 px-8"
            onClick={() => {
              setActiveMember(null);
              setInvitePosition("");
              setInvitePhone("");
              setDialog("invite");
            }}
          >
            Invite teammate
          </Button>
        </div>
      </div>

      {isLoading && <div className="v2-tbl-empty">Loading team…</div>}
      {isError && (
        <div className="v2-tbl-empty">
          {error?.message ?? "Could not load platform team."}
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <div className="v2-tbl-empty">
          {hasSearch
            ? "No users match your search."
            : "No platform admins yet — invite someone to create the first admin seat."}
        </div>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="v2-tbl v2-tbl--staff">
          <div className="v2-tbl-th">
            <span>Member</span>
            <span>Position</span>
            <span>Email</span>
            <span>Phone</span>
            <span className="v2-tbl-th-role">Status</span>
            <span className="v2-tbl-th-joined">Joined</span>
            <span className="v2-tbl-th-actions">Actions</span>
          </div>
          {rows.map((m) => (
            <div key={m.id} className="v2-tbl-row v2-tbl-row--plain">
              <div className="v2-tbl-co">
                <div
                  className="v2-tbl-logo overflow-hidden p-0"
                  style={{ background: "var(--v2-accent-deep)" }}
                >
                  {m.image ? (
                    <img
                      src={m.image}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    initialsOf(m.name)
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="v2-tbl-name flex flex-wrap items-center gap-2">
                    {m.name}
                    {m.id === currentUserId ? (
                      <Badge variant="secondary" className="font-normal">
                        You
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              <span
                className="v2-tbl-cell-muted truncate text-[13px]"
                title={m.staffPosition ?? undefined}
              >
                {m.staffPosition?.trim() ? m.staffPosition : "—"}
              </span>
              <span className="v2-tbl-cell-muted truncate" title={m.email}>
                {m.email}
              </span>
              <span
                className="v2-tbl-cell-muted truncate text-[13px]"
                title={m.phone ?? undefined}
              >
                {m.phone?.trim() ? m.phone : "—"}
              </span>
              <span className="v2-tbl-role-cell flex flex-wrap items-center gap-1.5">
                {hasSearch && m.role !== "admin" ? (
                  <Badge variant="secondary" className="font-normal capitalize">
                    {m.role.replace("_", " ")}
                  </Badge>
                ) : null}
                {m.emailVerified ? (
                  <Badge variant="outline" className="font-normal">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="font-normal">
                    Pending email
                  </Badge>
                )}
              </span>
              <span className="v2-tbl-cell-muted v2-tbl-joined-cell">
                {fmtJoined(m.createdAt)}
              </span>
              <div
                className="v2-tbl-action-hit"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      aria-label={`Actions for ${m.name}`}
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-48">
                    <DropdownMenuItem onSelect={() => openFor(m, "edit")}>
                      Edit user
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openFor(m, "email")}>
                      Change email…
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openFor(m, "password")}>
                      Set password…
                    </DropdownMenuItem>
                    {!m.emailVerified &&
                    m.id !== currentUserId &&
                    m.role === "admin" ? (
                      <DropdownMenuItem
                        onSelect={() =>
                          verifyMut.mutate({ userId: m.id })
                        }
                      >
                        Mark email verified
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    {m.role === "admin" ? (
                      <DropdownMenuItem
                        onSelect={() => openFor(m, "demote")}
                        disabled={platformAdminTotal <= 1}
                      >
                        Remove admin access…
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onSelect={() => openFor(m, "promote")}
                      >
                        Give admin access…
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={m.id === currentUserId}
                      onSelect={() => openFor(m, "delete")}
                    >
                      Delete account…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite new admin */}
      <Dialog
        open={dialog === "invite"}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
              Invite teammate
            </DialogTitle>
            <DialogDescription>
              Creates a new Energized account with platform admin access. The
              email is marked verified so they can sign in right away. Add a
              position and phone so they appear correctly in the admin directory.
            </DialogDescription>
          </DialogHeader>
          <div className="v2-admin-users-field">
            <label htmlFor="staff-invite-name">Name</label>
            <input
              id="staff-invite-name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="staff-invite-position">Position</label>
            <input
              id="staff-invite-position"
              value={invitePosition}
              onChange={(e) => setInvitePosition(e.target.value)}
              placeholder="e.g. Head of operations"
              autoComplete="organization-title"
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="staff-invite-phone">Phone</label>
            <input
              id="staff-invite-phone"
              type="tel"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              placeholder="Optional"
              autoComplete="tel"
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="staff-invite-email">Work email</label>
            <input
              id="staff-invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="staff-invite-pw">Temporary password</label>
            <input
              id="staff-invite-pw"
              type="password"
              value={invitePassword}
              onChange={(e) => setInvitePassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="staff-invite-confirm">Confirm password</label>
            <input
              id="staff-invite-confirm"
              type="password"
              value={inviteConfirm}
              onChange={(e) => setInviteConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <DialogFooter className="mx-0 mb-0 flex flex-col-reverse gap-1.5 border-0 bg-transparent px-1 pb-2 pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                !inviteName.trim() ||
                !inviteEmail.trim() ||
                invitePassword.length < 8 ||
                invitePassword !== inviteConfirm ||
                createMut.isPending
              }
              onClick={() => {
                createMut.mutate({
                  name: inviteName.trim(),
                  email: inviteEmail.trim(),
                  password: invitePassword,
                  role: "admin",
                  ...(invitePhone.trim()
                    ? { phone: invitePhone.trim() }
                    : {}),
                  ...(invitePosition.trim()
                    ? { staffPosition: invitePosition.trim() }
                    : {}),
                });
              }}
            >
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog
        open={dialog === "edit"}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
              Edit teammate
            </DialogTitle>
            <DialogDescription>
              Update how <strong>{activeMember?.email}</strong> appears on the
              platform. Role stays platform admin — use{" "}
              <em>Remove admin access</em> to revoke console login.
            </DialogDescription>
          </DialogHeader>
          <input
            ref={avatarFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void uploadStaffAvatarFile(f);
            }}
          />
          <div className="flex flex-wrap items-center gap-4 border-b border-border pb-5">
            <div className="relative flex size-[72px] shrink-0 overflow-hidden rounded-xl bg-[var(--v2-accent-deep)] text-lg font-bold text-white">
              {editAvatarUrl ? (
                <img
                  src={editAvatarUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="m-auto">
                  {activeMember
                    ? initialsOf(editName.trim() || activeMember.name)
                    : "?"}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="text-sm font-semibold text-foreground">
                Profile photo
              </div>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, or WebP · up to 2 MB
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    avatarUploadBusy ||
                    updateMut.isPending ||
                    !activeMember
                  }
                  onClick={() => avatarFileInputRef.current?.click()}
                >
                  {avatarUploadBusy ? "Uploading…" : "Upload photo"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  disabled={
                    !editAvatarUrl ||
                    updateMut.isPending ||
                    avatarUploadBusy ||
                    !activeMember
                  }
                  onClick={() => removeStaffAvatar()}
                >
                  Remove photo
                </Button>
              </div>
            </div>
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="staff-edit-name">Name</label>
            <input
              id="staff-edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="staff-edit-position">Position</label>
            <input
              id="staff-edit-position"
              value={editPosition}
              onChange={(e) => setEditPosition(e.target.value)}
              placeholder="e.g. Platform support lead"
              autoComplete="organization-title"
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="staff-edit-phone">Phone</label>
            <input
              id="staff-edit-phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              autoComplete="tel"
              placeholder="Optional"
            />
          </div>
          <DialogFooter className="mx-0 mb-0 flex flex-col-reverse gap-1.5 border-0 bg-transparent px-1 pb-2 pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                !activeMember || !editName.trim() || updateMut.isPending
              }
              onClick={() => {
                if (!activeMember) return;
                updateMut.mutate(
                  {
                    userId: activeMember.id,
                    name: editName.trim(),
                    staffPosition: editPosition.trim()
                      ? editPosition.trim()
                      : null,
                    phone: editPhone.trim() || null,
                  },
                  {
                    onSuccess: () => {
                      toast.success("Saved.");
                      closeDialog();
                    },
                  },
                );
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change email */}
      <Dialog
        open={dialog === "email"}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
              Change email address
            </DialogTitle>
            <DialogDescription>
              Replaces the sign-in email. It will show as unverified until they
              confirm the new address.
            </DialogDescription>
          </DialogHeader>
          <div className="v2-admin-users-field">
            <label htmlFor="staff-new-email">New email</label>
            <input
              id="staff-new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <DialogFooter className="mx-0 mb-0 flex flex-col-reverse gap-1.5 border-0 bg-transparent px-1 pb-2 pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!activeMember || !newEmail.trim() || emailMut.isPending}
              onClick={() => {
                if (!activeMember) return;
                emailMut.mutate({
                  userId: activeMember.id,
                  newEmail: newEmail.trim(),
                });
              }}
            >
              Update email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password */}
      <Dialog
        open={dialog === "password"}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
              Set password
            </DialogTitle>
            <DialogDescription>
              Sets a password for{" "}
              <strong>{activeMember?.email}</strong>. If they use Google sign-in
              only, this adds email login as well.
            </DialogDescription>
          </DialogHeader>
          <div className="v2-admin-users-field">
            <label htmlFor="staff-new-pw">New password</label>
            <input
              id="staff-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="staff-confirm-pw">Confirm password</label>
            <input
              id="staff-confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <DialogFooter className="mx-0 mb-0 flex flex-col-reverse gap-1.5 border-0 bg-transparent px-1 pb-2 pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                !activeMember ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword ||
                passwordMut.isPending
              }
              onClick={() => {
                if (!activeMember) return;
                passwordMut.mutate({
                  userId: activeMember.id,
                  newPassword,
                });
              }}
            >
              Save password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Demote */}
      <Dialog
        open={dialog === "demote"}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
              Remove admin access
            </DialogTitle>
            <DialogDescription>
              <strong>{activeMember?.name}</strong> ({activeMember?.email}) will
              lose access to this console. If they were upgraded from an existing
              account, their previous role is restored; otherwise they become a
              jobseeker. Employer organizations they belonged to are unchanged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 flex flex-col-reverse gap-1.5 border-0 bg-transparent px-1 pb-2 pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                !activeMember ||
                demoteMut.isPending ||
                platformAdminTotal <= 1
              }
              onClick={() => {
                if (!activeMember) return;
                if (
                  !window.confirm(
                    `Remove platform admin access for ${activeMember.name} (${activeMember.email})?`,
                  )
                ) {
                  return;
                }
                demoteMut.mutate({ userId: activeMember.id });
              }}
            >
              Remove admin access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote */}
      <Dialog
        open={dialog === "promote"}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
              Give admin access
            </DialogTitle>
            <DialogDescription>
              <strong>{activeMember?.name}</strong> ({activeMember?.email}) will
              be able to sign in to this admin console, billing, verifications, and
              user tools. Their current role is replaced with platform admin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 flex flex-col-reverse gap-1.5 border-0 bg-transparent px-1 pb-2 pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!activeMember || promoteMut.isPending}
              onClick={() => {
                if (!activeMember) return;
                if (
                  !window.confirm(
                    `Grant platform admin access to ${activeMember.name} (${activeMember.email})?`,
                  )
                ) {
                  return;
                }
                promoteMut.mutate({ email: activeMember.email });
              }}
            >
              Give admin access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog
        open={dialog === "delete"}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
              Delete account
            </DialogTitle>
            <DialogDescription>
              Permanently delete <strong>{activeMember?.name}</strong> (
              {activeMember?.email}
              ). Use this only if the whole account should leave Energized — not
              just admin access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 flex flex-col-reverse gap-1.5 border-0 bg-transparent px-1 pb-2 pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!activeMember || deleteMut.isPending}
              onClick={() => {
                if (!activeMember) return;
                deleteMut.mutate({ userId: activeMember.id });
              }}
            >
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
