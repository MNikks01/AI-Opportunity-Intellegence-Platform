import { listCategories } from "@aioi/database";
import { apiJson } from "../_lib";

export const dynamic = "force-dynamic";

/** The AI/tech content taxonomy — category keys + names used by the news filters. */
export async function GET() {
  const categories = await listCategories();
  return apiJson(
    categories.map((c) => ({ key: c.key, name: c.name, parentId: c.parentId })),
    { count: categories.length },
  );
}
