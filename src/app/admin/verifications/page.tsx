import { api } from "@/lib/trpc/server";
import { VerificationsClient } from "./verifications-client";

export const metadata = { title: "Verifications · Admin · Energized" };

export default async function VerificationsPage() {
  const [counts, employers, credentials] = await Promise.all([
    api.admin.verifications.counts(),
    api.admin.verifications.employers(),
    api.admin.verifications.credentials({ status: "pending" }),
  ]);

  return (
    <>
      <header className="v2-ahead" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <span className="v2-eyebrow">Trust &amp; safety</span>
          <h1>
            Identity &amp; employer <em>verifications.</em>
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            Approve employer organisations and candidate credential scans before they appear on public profiles.
          </p>
        </div>
      </header>
      <VerificationsClient
        initialCounts={counts}
        initialEmployers={employers}
        initialCredentials={credentials}
      />
    </>
  );
}
