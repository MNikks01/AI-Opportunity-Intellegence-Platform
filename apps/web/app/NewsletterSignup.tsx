"use client";

import { useActionState } from "react";
import { subscribeAction } from "./newsletter-actions";

export function NewsletterSignup() {
  const [state, action, pending] = useActionState(subscribeAction, {});

  if (state?.ok) {
    return (
      <p className="newsletter-done">
        Subscribed ✓ — you&rsquo;ll get the week&rsquo;s top AI opportunities.
      </p>
    );
  }

  return (
    <form action={action} className="newsletter-form">
      <input
        name="email"
        type="email"
        required
        placeholder="you@company.com"
        aria-label="Email address"
        className="newsletter-input"
      />
      <button type="submit" className="home-btn home-btn-primary" disabled={pending}>
        {pending ? "…" : "Subscribe"}
      </button>
      {state?.error && <span className="newsletter-error">{state.error}</span>}
    </form>
  );
}
