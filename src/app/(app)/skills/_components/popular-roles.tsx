import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Sector = {
  slug: string;
  name: string;
  tileColor: string;
  roles: { slug: string; name: string; subDescription: string | null }[];
};

export function PopularRoles({ sectors }: { sectors: Sector[] }) {
  const top = sectors
    .flatMap((s) => s.roles.slice(0, 1).map((r) => ({ ...r, sector: s })))
    .slice(0, 9);
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <h2 className="text-3xl font-normal tracking-tight md:text-4xl">
          Most-taken <em className="not-italic italic text-[var(--brand-dark-blue)]">roles</em>.
        </h2>
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Updated weekly · {sectors.length} sectors
        </div>
      </div>
      <div className="border-t border-slate-200">
        {top.map((r, i) => (
          <Link
            key={r.slug}
            href={`/skills/${r.slug}/configure`}
            className="group grid grid-cols-[40px_1fr_44px] items-center gap-6 border-b border-slate-200 px-2 py-5 transition hover:bg-white hover:px-4 md:grid-cols-[60px_1.4fr_1fr_60px]"
          >
            <div className="text-xs font-bold uppercase text-slate-400">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div>
              <div className="text-2xl font-normal tracking-tight">{r.name}</div>
              {r.subDescription && (
                <div className="mt-1 text-sm text-slate-500">{r.subDescription}</div>
              )}
            </div>
            <div className="hidden md:block">
              <span
                className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold"
                style={{ background: `${r.sector.tileColor}22`, color: r.sector.tileColor }}
              >
                {r.sector.name}
              </span>
            </div>
            <div className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-500 transition group-hover:border-[var(--brand-blue)] group-hover:bg-[var(--brand-blue)] group-hover:text-[var(--brand-black)] group-hover:[transform:rotate(-45deg)]">
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
