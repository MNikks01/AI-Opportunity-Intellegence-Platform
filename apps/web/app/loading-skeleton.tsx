/** Card-grid loading skeleton, used as the Suspense fallback (loading.tsx) for data-heavy pages. */
export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <main aria-busy="true" aria-label="Loading">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-sub" />
      <div className="skeleton-grid">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </main>
  );
}
