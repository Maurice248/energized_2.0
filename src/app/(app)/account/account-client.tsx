"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, signOut } from "@/lib/auth/client";
import { PasswordInput } from "@/components/shared/password-input";
import { PasswordStrength } from "@/components/shared/password-strength";

export function AccountClient({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(name);
  const [newEmail, setNewEmail] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState<
    "name" | "email" | "password" | "signout" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSaveName = async () => {
    setError(null);
    setNotice(null);
    const next = displayName.trim();
    if (!next || next === name) return;
    setBusy("name");
    try {
      const { error: err } = await authClient.updateUser({ name: next });
      if (err) throw new Error(err.message ?? "Could not update name");
      setNotice("Display name updated.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const handleChangeEmail = async () => {
    setError(null);
    setNotice(null);
    const next = newEmail.trim().toLowerCase();
    if (!next || next === email.toLowerCase()) return;
    setBusy("email");
    try {
      const { error: err } = await authClient.changeEmail({ newEmail: next });
      if (err) throw new Error(err.message ?? "Could not change email");
      setNotice(
        `Check ${email} for a link to approve the change to ${next}.`,
      );
      setNewEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Change failed");
    } finally {
      setBusy(null);
    }
  };

  const handleChangePassword = async () => {
    setError(null);
    setNotice(null);
    if (!currentPw || !newPw) return;
    if (newPw.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setError("New password and confirmation don't match.");
      return;
    }
    setBusy("password");
    try {
      const { error: err } = await authClient.changePassword({
        currentPassword: currentPw,
        newPassword: newPw,
        revokeOtherSessions: true,
      });
      if (err) throw new Error(err.message ?? "Could not change password");
      setNotice("Password updated. Other sessions have been signed out.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Password change failed");
    } finally {
      setBusy(null);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    setBusy("signout");
    try {
      await signOut();
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-out failed");
    } finally {
      setBusy(null);
    }
  };

  const nameDirty = displayName.trim() !== name && displayName.trim() !== "";

  return (
    <div className="v2" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {notice && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--v2-ink-50)",
            border: "1px solid var(--v2-ink-200)",
            color: "var(--v2-ink-900)",
            borderRadius: "var(--v2-r-md)",
            fontSize: 13,
          }}
        >
          {notice}
        </div>
      )}
      {error && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            background: "var(--v2-coral-soft)",
            color: "#A63A20",
            borderRadius: "var(--v2-r-md)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <Card title="Display name">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="v2-input-block"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="v2-btn v2-btn-primary v2-btn-sm"
            onClick={handleSaveName}
            disabled={!nameDirty || busy !== null}
          >
            {busy === "name" ? "Saving…" : "Save"}
          </button>
        </div>
      </Card>

      <Card
        title="Email"
        sub={
          <>
            Current:{" "}
            <strong style={{ color: "var(--v2-ink-900)" }}>{email}</strong>
            {" — "}we&rsquo;ll email a confirmation link to your current address
            before switching.
          </>
        }
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="v2-input-block"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@example.com"
            autoComplete="email"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="v2-btn v2-btn-primary v2-btn-sm"
            onClick={handleChangeEmail}
            disabled={
              !newEmail.trim() ||
              newEmail.trim().toLowerCase() === email.toLowerCase() ||
              busy !== null
            }
          >
            {busy === "email" ? "Sending…" : "Change email"}
          </button>
        </div>
      </Card>

      <Card
        title="Password"
        sub="Changing your password signs out other sessions on every device."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <PasswordInput
            className="v2-input-block"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
          />
          <div>
            <PasswordInput
              className="v2-input-block"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password (8+ characters)"
              autoComplete="new-password"
            />
            {newPw && <PasswordStrength value={newPw} />}
          </div>
          <PasswordInput
            className="v2-input-block"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className="v2-btn v2-btn-primary v2-btn-sm"
            onClick={handleChangePassword}
            disabled={!currentPw || !newPw || !confirmPw || busy !== null}
          >
            {busy === "password" ? "Updating…" : "Change password"}
          </button>
        </div>
      </Card>

      <Card title="Sign out">
        <button
          type="button"
          className="v2-btn v2-btn-ghost v2-btn-sm"
          onClick={handleSignOut}
          disabled={busy !== null}
        >
          {busy === "signout" ? "Signing out…" : "Sign out of this session"}
        </button>
      </Card>
    </div>
  );
}

function Card({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "white",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: "var(--v2-r-lg)",
        padding: 22,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "var(--v2-ink-950)",
          marginBottom: sub ? 4 : 14,
        }}
      >
        {title}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 12,
            color: "var(--v2-ink-500)",
            marginBottom: 14,
          }}
        >
          {sub}
        </div>
      )}
      {children}
    </section>
  );
}
