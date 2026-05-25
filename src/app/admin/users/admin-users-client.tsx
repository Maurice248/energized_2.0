"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/trpc/client";
import { Toaster } from "@/components/ui/sonner";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KpiCard } from "@/app/admin/_components/kpi-card";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  phone: string | null;
};

type DialogMode = "edit" | "email" | "password" | "delete" | "add" | null;

type AdminUserRole = "jobseeker" | "employer" | "recruiter" | "admin";
/** Roles exposed in list filter and Add user (matches admin router assignable roles). */
type AdminAssignableRole = Exclude<AdminUserRole, "recruiter">;
type RoleFilter = "all" | AdminAssignableRole;

function roleToneClass(role: string): string {
  if (role === "admin") return "enterprise";
  if (role === "employer") return "growth";
  if (role === "recruiter") return "starter";
  return "trial";
}

function displayRole(role: string): string {
  const map: Record<string, string> = {
    jobseeker: "Jobseeker",
    employer: "Employer",
    recruiter: "Recruiter",
    admin: "Admin",
  };
  return map[role] ?? role;
}

function fmtJoined(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
  }).format(new Date(d));
}

export function AdminUsersClient() {
  const utils = api.useUtils();

  const [searchDraft, setSearchDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchDraft.trim()), 300);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const listInput = useMemo(() => {
    const o: { search?: string; role?: AdminAssignableRole } = {};
    if (debouncedSearch) o.search = debouncedSearch;
    if (roleFilter !== "all") o.role = roleFilter;
    return Object.keys(o).length ? o : {};
  }, [debouncedSearch, roleFilter]);

  const { data, isLoading, isError, error } =
    api.admin.users.list.useQuery(listInput);

  const { data: stats, isLoading: statsLoading } =
    api.admin.users.stats.useQuery();

  async function invalidateUserQueries() {
    await Promise.all([
      utils.admin.users.list.invalidate(),
      utils.admin.users.stats.invalidate(),
    ]);
  }

  const [activeUser, setActiveUser] = useState<UserRow | null>(null);
  const [dialog, setDialog] = useState<DialogMode>(null);

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<string>("jobseeker");
  const [editPhone, setEditPhone] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addConfirm, setAddConfirm] = useState("");
  const [addRole, setAddRole] = useState<AdminAssignableRole>("jobseeker");

  const updateMut = api.admin.users.update.useMutation({
    onSuccess: async () => {
      toast.success("User updated.");
      await invalidateUserQueries();
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const emailMut = api.admin.users.changeEmail.useMutation({
    onSuccess: async () => {
      toast.success("Email updated. The user should verify their inbox.");
      await invalidateUserQueries();
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const passwordMut = api.admin.users.setPassword.useMutation({
    onSuccess: async () => {
      toast.success("Password saved.");
      await invalidateUserQueries();
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = api.admin.users.deleteUser.useMutation({
    onSuccess: async () => {
      toast.success("User deleted.");
      await invalidateUserQueries();
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const createMut = api.admin.users.create.useMutation({
    onSuccess: async () => {
      toast.success("User created. They can sign in with the email and password you set.");
      await invalidateUserQueries();
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  function closeDialog() {
    setDialog(null);
    setActiveUser(null);
    setNewEmail("");
    setNewPassword("");
    setConfirmPassword("");
    setAddName("");
    setAddEmail("");
    setAddPassword("");
    setAddConfirm("");
    setAddRole("jobseeker");
  }

  function openFor(u: UserRow, mode: DialogMode) {
    setActiveUser(u);
    setDialog(mode);
    if (mode === "edit") {
      setEditName(u.name);
      setEditRole(u.role);
      setEditPhone(u.phone ?? "");
    }
    if (mode === "email") {
      setNewEmail(u.email);
    }
  }

  const rows = useMemo(() => data?.users ?? [], [data?.users]);
  const currentUserId = data?.currentUserId;
  const hasActiveFilters = debouncedSearch.length > 0 || roleFilter !== "all";

  return (
    <>
      <Toaster richColors position="top-center" />
      <header className="v2-ahead" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <span className="v2-eyebrow">People</span>
          <h1>
            User <em>Management</em>
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            Every account on the platform — name, email, role, and join date. Use the menu to edit
            details, change sign-in email, set a password, or remove an account.
          </p>
        </div>
      </header>

      <div className="v2-akpi-row v2-akpi-row--four" style={{ marginBottom: 24 }}>
        <KpiCard
          eyebrow="Total users"
          icon="users"
          value={
            statsLoading ? "—" : (stats?.total ?? 0).toLocaleString()
          }
          note="All roles"
        />
        <KpiCard
          eyebrow="Admins"
          icon="shield"
          value={
            statsLoading ? "—" : (stats?.admin ?? 0).toLocaleString()
          }
        />
        <KpiCard
          eyebrow="Employers"
          icon="building"
          value={
            statsLoading ? "—" : (stats?.employer ?? 0).toLocaleString()
          }
        />
        <KpiCard
          eyebrow="Jobseekers"
          icon="user"
          value={
            statsLoading ? "—" : (stats?.jobseeker ?? 0).toLocaleString()
          }
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
            placeholder="Search by name or email…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            aria-label="Search users"
          />
          <div className="w-44 shrink-0">
            <label htmlFor="admin-users-role-filter" className="sr-only">
              Filter by role
            </label>
            <select
              id="admin-users-role-filter"
              className="v2-admin-users-select !mt-0 h-10 w-full py-0"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            >
              <option value="all">All roles</option>
              <option value="jobseeker">Jobseeker</option>
              <option value="employer">Employer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <Button
          type="button"
          className="v2-admin-users-add-btn h-10 min-w-[7rem] shrink-0 px-5"
          onClick={() => {
            setActiveUser(null);
            setDialog("add");
          }}
        >
          Add user
        </Button>
      </div>

      {isLoading && (
        <div className="v2-tbl-empty">Loading users…</div>
      )}
      {isError && (
        <div className="v2-tbl-empty">
          {error?.message ?? "Could not load users."}
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <div className="v2-tbl-empty">
          {hasActiveFilters
            ? "No users match your search or filters."
            : "No users found."}
        </div>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="v2-tbl v2-tbl--users">
          <div className="v2-tbl-th">
            <span>Name</span>
            <span>Email</span>
            <span className="v2-tbl-th-role">Role</span>
            <span className="v2-tbl-th-joined">Joined</span>
            <span className="v2-tbl-th-actions">Actions</span>
          </div>
          {rows.map((u) => (
            <div key={u.id} className="v2-tbl-row v2-tbl-row--plain">
              <div className="v2-tbl-co">
                <div
                  className="v2-tbl-logo"
                  style={{
                    background:
                      u.role === "admin"
                        ? "var(--v2-accent-deep)"
                        : "#1CAAE2",
                  }}
                >
                  {u.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase() || "?"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="v2-tbl-name">{u.name}</div>
                </div>
              </div>
              <span className="v2-tbl-cell-muted" title={u.email}>
                {u.email}
              </span>
              <span
                className={`v2-tbl-plan v2-tbl-role-cell ${roleToneClass(u.role)}`}
                title={u.role}
              >
                {displayRole(u.role)}
              </span>
              <span className="v2-tbl-cell-muted v2-tbl-joined-cell">
                {fmtJoined(u.createdAt)}
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
                      aria-label={`Actions for ${u.name}`}
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    <DropdownMenuItem onSelect={() => openFor(u, "edit")}>
                      Edit user
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openFor(u, "email")}>
                      Change email address
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openFor(u, "password")}>
                      Change password
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={u.id === currentUserId}
                      onSelect={() => openFor(u, "delete")}
                    >
                      Delete user
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={dialog === "add"}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
              Add user
            </DialogTitle>
            <DialogDescription>
              Creates an account with email and password. The address is marked
              verified so they can sign in immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="v2-admin-users-field">
            <label htmlFor="admin-add-name">Name</label>
            <input
              id="admin-add-name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="admin-add-email">Email</label>
            <input
              id="admin-add-email"
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="admin-add-role">Role</label>
            <select
              id="admin-add-role"
              className="v2-admin-users-select"
              value={addRole}
              onChange={(e) =>
                setAddRole(e.target.value as AdminAssignableRole)
              }
            >
              <option value="jobseeker">Jobseeker</option>
              <option value="employer">Employer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="admin-add-pw">Password</label>
            <input
              id="admin-add-pw"
              type="password"
              value={addPassword}
              onChange={(e) => setAddPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="admin-add-confirm-pw">Confirm password</label>
            <input
              id="admin-add-confirm-pw"
              type="password"
              value={addConfirm}
              onChange={(e) => setAddConfirm(e.target.value)}
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
                !addName.trim() ||
                !addEmail.trim() ||
                addPassword.length < 8 ||
                addPassword !== addConfirm ||
                createMut.isPending
              }
              onClick={() => {
                createMut.mutate({
                  name: addName.trim(),
                  email: addEmail.trim(),
                  password: addPassword,
                  role: addRole,
                });
              }}
            >
              Create user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "edit"}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
              Edit user
            </DialogTitle>
            <DialogDescription>
              Update display name, role, and profile phone for{" "}
              <strong>{activeUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="v2-admin-users-field">
            <label htmlFor="admin-edit-name">Name</label>
            <input
              id="admin-edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="admin-edit-role">Role</label>
            <select
              id="admin-edit-role"
              className="v2-admin-users-select"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
            >
              <option value="jobseeker">Jobseeker</option>
              <option value="employer">Employer</option>
              <option value="recruiter">Recruiter</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="admin-edit-phone">Phone</label>
            <input
              id="admin-edit-phone"
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
              disabled={!activeUser || !editName.trim() || updateMut.isPending}
              onClick={() => {
                if (!activeUser) return;
                updateMut.mutate({
                  userId: activeUser.id,
                  name: editName.trim(),
                  role: editRole as
                    | "jobseeker"
                    | "employer"
                    | "recruiter"
                    | "admin",
                  phone: editPhone.trim() || null,
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Replaces the sign-in email for this account. The address will be
              marked unverified until they complete email confirmation.
            </DialogDescription>
          </DialogHeader>
          <div className="v2-admin-users-field">
            <label htmlFor="admin-new-email">New email</label>
            <input
              id="admin-new-email"
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
              disabled={!activeUser || !newEmail.trim() || emailMut.isPending}
              onClick={() => {
                if (!activeUser) return;
                emailMut.mutate({
                  userId: activeUser.id,
                  newEmail: newEmail.trim(),
                });
              }}
            >
              Update email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "password"}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
              Change password
            </DialogTitle>
            <DialogDescription>
              Sets a new password for{" "}
              <strong>{activeUser?.email}</strong>. If they only had a social
              sign-in, a password account is created so they can sign in with
              email as well.
            </DialogDescription>
          </DialogHeader>
          <div className="v2-admin-users-field">
            <label htmlFor="admin-new-pw">New password</label>
            <input
              id="admin-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="v2-admin-users-field">
            <label htmlFor="admin-confirm-pw">Confirm password</label>
            <input
              id="admin-confirm-pw"
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
                !activeUser ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword ||
                passwordMut.isPending
              }
              onClick={() => {
                if (!activeUser) return;
                passwordMut.mutate({
                  userId: activeUser.id,
                  newPassword,
                });
              }}
            >
              Save password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "delete"}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
              Delete user
            </DialogTitle>
            <DialogDescription>
              Permanently remove <strong>{activeUser?.name}</strong> (
              {activeUser?.email}
              ). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 flex flex-col-reverse gap-1.5 border-0 bg-transparent px-1 pb-2 pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!activeUser || deleteMut.isPending}
              onClick={() => {
                if (!activeUser) return;
                deleteMut.mutate({ userId: activeUser.id });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
