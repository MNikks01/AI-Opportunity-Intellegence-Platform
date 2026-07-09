"use server";

import { subscribe } from "@aioi/database";

/** Subscribe to the weekly digest. useActionState shape. The user enters their own email. */
export async function subscribeAction(
  _prev: { ok?: boolean; error?: string },
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@") || email.length > 254) return { error: "Enter a valid email address." };
  try {
    await subscribe(email);
    return { ok: true };
  } catch {
    return { error: "Something went wrong — please try again." };
  }
}
