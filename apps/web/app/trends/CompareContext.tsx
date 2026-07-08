"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export const COMPARE_MAX = 4;

interface CompareState {
  slugs: string[];
  toggle: (slug: string) => void;
  clear: () => void;
}

const Ctx = createContext<CompareState | null>(null);

/** Holds the browse-page compare selection (client-only; resets on navigation). */
export function CompareProvider({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const toggle = (slug: string) =>
    setSlugs((cur) =>
      cur.includes(slug)
        ? cur.filter((s) => s !== slug)
        : cur.length >= COMPARE_MAX
          ? cur
          : [...cur, slug],
    );
  const clear = () => setSlugs([]);
  return <Ctx.Provider value={{ slugs, toggle, clear }}>{children}</Ctx.Provider>;
}

export function useCompare(): CompareState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCompare must be used within CompareProvider");
  return c;
}
