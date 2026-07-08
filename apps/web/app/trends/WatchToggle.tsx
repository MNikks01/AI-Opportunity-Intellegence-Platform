import { toggleWatchAction } from "../watchlists/actions";

/** One-click watch toggle rendered on a trend card (adds/removes on the org's primary watchlist). */
export function WatchToggle({ trendId, watched }: { trendId: string; watched: boolean }) {
  return (
    <form action={toggleWatchAction}>
      <input type="hidden" name="trendId" value={trendId} />
      <input type="hidden" name="watched" value={String(watched)} />
      <button
        type="submit"
        className={`watch-toggle${watched ? " is-on" : ""}`}
        aria-pressed={watched}
      >
        {watched ? "✓ Watching" : "+ Watch"}
      </button>
    </form>
  );
}
