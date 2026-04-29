export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="mb-6 h-48 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    </main>
  );
}
