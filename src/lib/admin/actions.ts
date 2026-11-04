"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import type { Role } from "@prisma/client";
import { AuthGuardError, requireAdmin } from "@/lib/auth-guards";
import { writeAuditLog } from "@/lib/audit";
import { revokeAllUserSessions } from "@/lib/auth/sessions";
import { prisma } from "@/lib/db";
import {
  domainListSchema,
  domainValueSchema,
  domainValueUpdateSchema,
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/admin/schemas";

export type AdminActionResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string };

function formObject(formData: FormData) {
  const obj: Record<string, FormDataEntryValue | boolean | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (key === "isActive") {
      obj[key] = value === "true" || value === "on" || value === "1";
      continue;
    }
    if (key === "branchIds") {
      const existing = obj[key];
      if (Array.isArray(existing)) {
        existing.push(String(value));
      } else {
        obj[key] = [String(value)];
      }
      continue;
    }
    if (value instanceof File) continue;
    obj[key] = value;
  }
  if (!("branchIds" in obj)) obj.branchIds = [];
  if (!("isActive" in obj) && formData.has("isActivePresent")) {
    obj.isActive = false;
  }
  return obj;
}

async function syncBranchScopes(
  userId: string,
  role: Role,
  branchIds: string[],
) {
  await prisma.userBranchScope.deleteMany({ where: { userId } });
  if (role !== "BranchLeader") return;
  const unique = [...new Set(branchIds.filter(Boolean))];
  for (const branchId of unique) {
    await prisma.userBranchScope.create({
      data: { userId, branchId },
    });
  }
}

export async function createDomainListAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = domainListSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const created = await prisma.domainList.create({ data: parsed.data });
    await writeAuditLog({
      actorId: session.user.id,
      action: "admin.domain.create",
      entityType: "DomainList",
      entityId: created.id,
      metadata: { key: created.key },
    });
    revalidatePath("/admin/domains");
    return { ok: true, id: created.id };
  } catch (e) {
    if (e instanceof AuthGuardError) return { ok: false, error: e.message };
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return { ok: false, error: "A domain with that key already exists" };
    }
    return { ok: false, error: "Could not create domain list" };
  }
}

export async function addDomainValueAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = domainValueSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const created = await prisma.domainListValue.create({
      data: {
        domainListId: parsed.data.domainListId,
        value: parsed.data.value,
        label: parsed.data.label,
        sortOrder: parsed.data.sortOrder,
        parentValue: parsed.data.parentValue,
        isActive: parsed.data.isActive ?? true,
      },
    });
    await writeAuditLog({
      actorId: session.user.id,
      action: "admin.domain_value.create",
      entityType: "DomainListValue",
      entityId: created.id,
      metadata: {
        domainListId: created.domainListId,
        value: created.value,
        parentValue: created.parentValue,
      },
    });
    revalidatePath(`/admin/domains/${parsed.data.domainListId}`);
    revalidatePath("/admin/domains");
    return { ok: true, id: created.id };
  } catch (e) {
    if (e instanceof AuthGuardError) return { ok: false, error: e.message };
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return { ok: false, error: "That value already exists on this domain" };
    }
    return { ok: false, error: "Could not add domain value" };
  }
}

export async function updateDomainValueAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = domainValueUpdateSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const updated = await prisma.domainListValue.update({
      where: { id: parsed.data.id },
      data: {
        label: parsed.data.label,
        sortOrder: parsed.data.sortOrder,
        parentValue: parsed.data.parentValue,
        isActive: parsed.data.isActive,
      },
    });
    await writeAuditLog({
      actorId: session.user.id,
      action: "admin.domain_value.update",
      entityType: "DomainListValue",
      entityId: updated.id,
      metadata: { isActive: updated.isActive, parentValue: updated.parentValue },
    });
    revalidatePath(`/admin/domains/${updated.domainListId}`);
    revalidatePath("/admin/domains");
    return { ok: true, id: updated.id };
  } catch (e) {
    if (e instanceof AuthGuardError) return { ok: false, error: e.message };
    return { ok: false, error: "Could not update domain value" };
  }
}

export async function createUserAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = userCreateSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    if (
      parsed.data.role === "BranchLeader" &&
      (!parsed.data.branchIds || parsed.data.branchIds.length === 0)
    ) {
      return {
        ok: false,
        error: "Branch Leaders need at least one branch scope",
      };
    }
    const passwordHash = await hash(parsed.data.password, 12);
    const created = await prisma.user.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name,
        role: parsed.data.role as Role,
        passwordHash,
        isActive: parsed.data.isActive ?? true,
      },
    });
    await syncBranchScopes(
      created.id,
      created.role,
      parsed.data.branchIds ?? [],
    );
    await writeAuditLog({
      actorId: session.user.id,
      action: "admin.user.create",
      entityType: "User",
      entityId: created.id,
      metadata: { email: created.email, role: created.role },
    });
    revalidatePath("/admin/users");
    return { ok: true, id: created.id };
  } catch (e) {
    if (e instanceof AuthGuardError) return { ok: false, error: e.message };
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return { ok: false, error: "A user with that email already exists" };
    }
    return { ok: false, error: "Could not create user" };
  }
}

export async function updateUserAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = userUpdateSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    if (
      parsed.data.role === "BranchLeader" &&
      (!parsed.data.branchIds || parsed.data.branchIds.length === 0)
    ) {
      return {
        ok: false,
        error: "Branch Leaders need at least one branch scope",
      };
    }
    if (parsed.data.userId === session.user.id && !parsed.data.isActive) {
      return { ok: false, error: "You cannot deactivate your own account" };
    }
    if (
      parsed.data.userId === session.user.id &&
      parsed.data.role !== "Admin"
    ) {
      return { ok: false, error: "You cannot remove your own Admin role" };
    }

    const data: {
      name: string;
      role: Role;
      isActive: boolean;
      passwordHash?: string;
    } = {
      name: parsed.data.name,
      role: parsed.data.role as Role,
      isActive: parsed.data.isActive,
    };
    if (parsed.data.password) {
      data.passwordHash = await hash(parsed.data.password, 12);
    }

    const updated = await prisma.user.update({
      where: { id: parsed.data.userId },
      data,
    });
    await syncBranchScopes(
      updated.id,
      updated.role,
      parsed.data.branchIds ?? [],
    );
    if (!updated.isActive || parsed.data.password) {
      await revokeAllUserSessions(updated.id);
    }
    await writeAuditLog({
      actorId: session.user.id,
      action: "admin.user.update",
      entityType: "User",
      entityId: updated.id,
      metadata: {
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
        passwordChanged: Boolean(parsed.data.password),
        sessionsRevoked: !updated.isActive || Boolean(parsed.data.password),
      },
    });
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${updated.id}`);
    return { ok: true, id: updated.id };
  } catch (e) {
    if (e instanceof AuthGuardError) return { ok: false, error: e.message };
    return { ok: false, error: "Could not update user" };
  }
}
