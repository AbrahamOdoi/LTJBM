"use server";

import { revalidatePath } from "next/cache";
import type { CustomFieldType } from "@prisma/client";
import {
  AuthGuardError,
  requireAdmin,
  requireMembersWrite,
} from "@/lib/auth-guards";
import {
  createCustomFieldDefinition,
  setCustomFieldActive,
  upsertMemberCustomFields,
} from "@/lib/custom-fields/service";
import { assertMemberReadable } from "@/lib/members/access";

export type CustomFieldActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createCustomFieldAction(
  _prev: CustomFieldActionResult | null,
  formData: FormData,
): Promise<CustomFieldActionResult> {
  try {
    const session = await requireAdmin();
    const label = String(formData.get("label") || "").trim();
    if (!label) return { ok: false, error: "Label is required." };

    const fieldType = String(
      formData.get("fieldType") || "Text",
    ) as CustomFieldType;
    const optionsRaw = String(formData.get("options") || "").trim();
    const options = optionsRaw
      ? optionsRaw
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

    await createCustomFieldDefinition({
      label,
      key: String(formData.get("key") || "").trim() || null,
      fieldType,
      options,
      helpText: String(formData.get("helpText") || "").trim() || null,
      isRequired: String(formData.get("isRequired") || "") === "on",
      sortOrder: Number(formData.get("sortOrder") || 0) || 0,
      actorId: session.user.id,
    });

    revalidatePath("/admin/custom-fields");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create field",
    };
  }
}

export async function toggleCustomFieldAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") || "");
  const isActive = String(formData.get("isActive") || "") === "1";
  if (!id) return;
  await setCustomFieldActive(id, isActive, session.user.id);
  revalidatePath("/admin/custom-fields");
}

export async function saveMemberCustomFieldsAction(formData: FormData) {
  const session = await requireMembersWrite();
  const memberId = String(formData.get("memberId") || "");
  if (!memberId) return;

  await assertMemberReadable(session.user, memberId);

  const values: Array<{ fieldId: string; valueText: string | null }> = [];
  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith("cf_")) continue;
    const fieldId = key.slice(3);
    values.push({
      fieldId,
      valueText: String(raw ?? "").trim() || null,
    });
  }

  await upsertMemberCustomFields({
    memberId,
    values,
    actorId: session.user.id,
  });

  revalidatePath(`/members/${memberId}`);
}
