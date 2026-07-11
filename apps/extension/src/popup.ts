/**
 * Popup entry (ADR-0007). Wires the pure helpers in `./api` to the DOM, `fetch`, and `localStorage`.
 * Bundled by esbuild to dist/popup.js. No extension APIs / permissions needed — public read API + CORS.
 */
import {
  DEFAULT_BASE,
  type Opportunity,
  opportunitiesUrl,
  searchUrl,
  appUrl,
  authHeaders,
  toOpportunities,
} from "./api";

const LS_BASE = "aioi.base";
const LS_KEY = "aioi.key";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

function loadSettings(): { base: string; apiKey: string } {
  return {
    base: localStorage.getItem(LS_BASE) ?? DEFAULT_BASE,
    apiKey: localStorage.getItem(LS_KEY) ?? "",
  };
}

function render(items: Opportunity[]): void {
  const results = $("results");
  if (items.length === 0) {
    results.innerHTML = `<p class="muted">No opportunities found.</p>`;
    return;
  }
  results.innerHTML = "";
  for (const it of items) {
    const a = document.createElement("a");
    a.className = "row";
    a.href = it.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    const score = it.opportunity !== null ? `<span class="score">${it.opportunity}</span>` : "";
    a.innerHTML = `<span class="row-title"></span><span class="row-meta">${score}<span>opportunity</span></span>`;
    a.querySelector(".row-title")!.textContent = it.title; // textContent to avoid injection
    results.appendChild(a);
  }
}

async function load(url: string, apiKey: string): Promise<void> {
  const results = $("results");
  results.setAttribute("aria-busy", "true");
  $("status").textContent = "Loading…";
  results.innerHTML = `<p class="muted" id="status">Loading…</p>`;
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", ...authHeaders(apiKey) },
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    render(toOpportunities(await res.json()));
  } catch {
    results.innerHTML = `<p class="muted">Couldn't reach the API. Check the base URL in Settings.</p>`;
  } finally {
    results.setAttribute("aria-busy", "false");
  }
}

function init(): void {
  const settings = loadSettings();
  ($("base") as HTMLInputElement).value = settings.base;
  ($("key") as HTMLInputElement).value = settings.apiKey;
  ($("open-app") as HTMLAnchorElement).href = appUrl(settings.base);

  // Default view: the "build now" opportunities.
  void load(opportunitiesUrl(settings.base), settings.apiKey);

  let timer: ReturnType<typeof setTimeout> | undefined;
  $("search-form").addEventListener("submit", (e) => e.preventDefault());
  ($("q") as HTMLInputElement).addEventListener("input", (e) => {
    const q = (e.target as HTMLInputElement).value.trim();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const s = loadSettings();
      void load(q ? searchUrl(s.base, q) : opportunitiesUrl(s.base), s.apiKey);
    }, 250);
  });

  const toggle = $("settings-toggle");
  toggle.addEventListener("click", () => {
    const panel = $("settings");
    const open = panel.hasAttribute("hidden");
    if (open) panel.removeAttribute("hidden");
    else panel.setAttribute("hidden", "");
    toggle.setAttribute("aria-expanded", String(open));
  });

  $("save").addEventListener("click", () => {
    const base = ($("base") as HTMLInputElement).value.trim();
    const key = ($("key") as HTMLInputElement).value.trim();
    localStorage.setItem(LS_BASE, base || DEFAULT_BASE);
    localStorage.setItem(LS_KEY, key);
    ($("open-app") as HTMLAnchorElement).href = appUrl(base);
    const s = loadSettings();
    void load(opportunitiesUrl(s.base), s.apiKey);
  });
}

init();
