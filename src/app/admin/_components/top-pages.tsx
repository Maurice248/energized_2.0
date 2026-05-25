import { Sparkline } from "./sparkline";

type Page = { path: string; views: string; spark: number[] };

export function TopPages({ pages }: { pages: Page[] }) {
  if (pages.length === 0) {
    return (
      <div className="v2-mod-empty">
        Top pages will appear once PostHog credentials are configured.
      </div>
    );
  }
  return (
    <div className="v2-pages-list">
      {pages.map((p) => (
        <div key={p.path} className="v2-page-row">
          <div className="v2-page-path">{p.path}</div>
          <div className="v2-page-views">{p.views}</div>
          <div className="v2-page-spark">
            <Sparkline
              data={p.spark}
              height={18}
              stroke="#1CAAE2"
              showFill={false}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
