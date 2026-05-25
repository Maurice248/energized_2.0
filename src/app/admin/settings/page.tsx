import { Suspense } from "react";
import { getAdminSettingsDigest } from "@/lib/admin-settings-digest";
import { AdminSettingsClient } from "./admin-settings-client";

export const metadata = { title: "Site settings · Admin · Energized" };

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsBody />
    </Suspense>
  );
}

async function SettingsBody() {
  const digest = getAdminSettingsDigest();
  return <AdminSettingsClient digest={digest} />;
}

function SettingsSkeleton() {
  return (
    <>
      <header className="v2-ahead">
        <div>
          <span className="v2-eyebrow">&nbsp;</span>
          <h1 style={{ opacity: 0.35 }} aria-hidden>
            Loading…
          </h1>
          <p className="v2-ahead-sub" style={{ opacity: 0.35 }} aria-hidden>
            Loading workspace preferences…
          </p>
        </div>
      </header>
      <div className="v2-settings-loading" aria-busy>
        <div className="v2-settings-spinner" />
      </div>
    </>
  );
}
