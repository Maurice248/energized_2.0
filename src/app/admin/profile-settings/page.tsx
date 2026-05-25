import { AdminProfileSettingsClient } from "./admin-profile-settings-client";

export const metadata = { title: "Profile settings · Admin · Energized" };

export const dynamic = "force-dynamic";

export default function AdminProfileSettingsPage() {
  return (
    <>
      <header className="v2-ahead" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <span className="v2-eyebrow">Admin workspace</span>
          <h1>
            Profile <em>settings.</em>
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            Update how you appear in the admin console, your contact details, and notification preferences.
          </p>
        </div>
      </header>
      <AdminProfileSettingsClient />
    </>
  );
}
