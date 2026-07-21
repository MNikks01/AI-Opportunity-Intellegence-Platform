/** Display labels + flags for the Region enum (AI/tech vertical). Keep in sync with @aioi/intel-core. */
export const REGION_LABELS: Record<string, { label: string; flag: string }> = {
  US: { label: "United States", flag: "🇺🇸" },
  CHINA: { label: "China", flag: "🇨🇳" },
  INDIA: { label: "India", flag: "🇮🇳" },
  EUROPE: { label: "Europe", flag: "🇪🇺" },
  JAPAN: { label: "Japan", flag: "🇯🇵" },
  SOUTH_KOREA: { label: "South Korea", flag: "🇰🇷" },
  SINGAPORE: { label: "Singapore", flag: "🇸🇬" },
  CANADA: { label: "Canada", flag: "🇨🇦" },
  AUSTRALIA: { label: "Australia", flag: "🇦🇺" },
  OTHER: { label: "Worldwide / Other", flag: "🌐" },
};

/** Ordered region keys for filter dropdowns + the map grid. */
export const REGION_ORDER = [
  "US",
  "CHINA",
  "INDIA",
  "EUROPE",
  "JAPAN",
  "SOUTH_KOREA",
  "SINGAPORE",
  "CANADA",
  "AUSTRALIA",
  "OTHER",
] as const;

export function regionLabel(region: string | null): string {
  if (!region) return "—";
  return REGION_LABELS[region]?.label ?? region;
}

export function regionFlag(region: string | null): string {
  if (!region) return "";
  return REGION_LABELS[region]?.flag ?? "";
}
