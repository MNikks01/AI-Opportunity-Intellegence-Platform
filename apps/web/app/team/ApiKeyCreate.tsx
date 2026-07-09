"use client";

import { useActionState } from "react";
import { createApiKeyAction } from "./actions";

/** Create an API key and show the raw secret exactly once (server never returns it again). */
export function ApiKeyCreate() {
  const [state, action, pending] = useActionState(createApiKeyAction, {});
  return (
    <div>
      <form action={action} className="team-invite">
        <input
          name="name"
          className="team-input"
          placeholder="Key name (e.g. production)"
          aria-label="API key name"
        />
        <button type="submit" className="watch-btn" disabled={pending}>
          {pending ? "Creating…" : "Create key"}
        </button>
      </form>
      {state?.rawKey && (
        <div className="apikey-new">
          <div className="apikey-new-label">Copy your key now — it won&rsquo;t be shown again:</div>
          <code className="apikey-new-code">{state.rawKey}</code>
        </div>
      )}
    </div>
  );
}
