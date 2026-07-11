import { toggleEntityWatchAction } from "../../watchlists/actions";

/** Watch/unwatch a supply-side entity on the org's primary watchlist (B-032). */
export function EntityWatchToggle({ entityId, watched }: { entityId: string; watched: boolean }) {
  return (
    <form action={toggleEntityWatchAction}>
      <input type="hidden" name="entityId" value={entityId} />
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
