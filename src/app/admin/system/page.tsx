import { Suspense } from "react";
import { api } from "@/lib/trpc/server";
import {
  SystemPageView,
} from "../_components/system-page-view";

export const metadata = { title: "System health · Admin · Energized" };

export const dynamic = "force-dynamic";

export default function SystemPage() {
  return (
    <Suspense fallback={<SystemPageSkeleton />}>
      <SystemPageBody />
    </Suspense>
  );
}

async function SystemPageBody() {
  const system = await api.admin.system.list();
  return <SystemPageView system={system} />;
}

function SystemPageSkeleton() {
  return (
    <>
      <header className="v2-ahead">
        <div>
          <span className="v2-eyebrow">&nbsp;</span>
          <h1 style={{ opacity: 0.35 }} aria-hidden>
            Loading…
          </h1>
          <p className="v2-ahead-sub" style={{ opacity: 0.35 }} aria-hidden>
            Fetching probes and rollup metrics…
          </p>
        </div>
      </header>
      <div className="v2-supp-metrics" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="v2-supp-metric">
            <span className="v2-supp-metric-k" style={{ opacity: 0 }}>
              –
            </span>
            <span className="v2-supp-metric-v" style={{ opacity: 0.35 }}>
              …
            </span>
          </div>
        ))}
      </div>
      <div className="v2-acard" style={{ marginTop: 20, minHeight: 420, opacity: 0.4 }} aria-hidden />
    </>
  );
}
