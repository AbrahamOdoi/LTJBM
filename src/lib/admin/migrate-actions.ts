"use server";

import { revalidatePath } from "next/cache";
import { AuthGuardError, requireAdmin } from "@/lib/auth-guards";
import { writeAuditLog } from "@/lib/audit";
import {
  commitMemberImport,
  dryRunMemberImport,
  memberImportTemplateCsv,
  parseCsv,
  suggestMapping,
  type ColumnMapping,
  type MigrateDryRunResult,
  type MigrateCommitResult,
  MIGRATE_TARGET_FIELDS,
} from "@/lib/admin/migrate";

export type MigrateParseResult =
  | {
      ok: true;
      headers: string[];
      sampleRows: Record<string, string>[];
      rowCount: number;
      suggestedMapping: ColumnMapping;
      targets: typeof MIGRATE_TARGET_FIELDS;
    }
  | { ok: false; error: string };

export type MigrateDryRunActionResult =
  | ({ ok: true } & MigrateDryRunResult)
  | { ok: false; error: string };

export type MigrateCommitActionResult =
  | ({ ok: true } & MigrateCommitResult)
  | { ok: false; error: string };

export async function parseMigrateCsvAction(
  csvText: string,
): Promise<MigrateParseResult> {
  try {
    await requireAdmin();
    const trimmed = csvText?.trim() ?? "";
    if (!trimmed) return { ok: false, error: "CSV is empty." };
    if (trimmed.length > 2_000_000) {
      return { ok: false, error: "CSV is too large (max ~2MB text)." };
    }
    const parsed = parseCsv(trimmed);
    if (parsed.headers.length === 0) {
      return { ok: false, error: "Could not read CSV headers." };
    }
    return {
      ok: true,
      headers: parsed.headers,
      sampleRows: parsed.rows.slice(0, 5),
      rowCount: parsed.rows.length,
      suggestedMapping: suggestMapping(parsed.headers),
      targets: MIGRATE_TARGET_FIELDS,
    };
  } catch (e) {
    if (e instanceof AuthGuardError) return { ok: false, error: e.message };
    return { ok: false, error: "Failed to parse CSV." };
  }
}

export async function dryRunMigrateAction(
  csvText: string,
  mapping: ColumnMapping,
): Promise<MigrateDryRunActionResult> {
  try {
    await requireAdmin();
    const result = await dryRunMemberImport(csvText, mapping);
    return { ok: true, ...result };
  } catch (e) {
    if (e instanceof AuthGuardError) return { ok: false, error: e.message };
    return { ok: false, error: "Dry-run failed." };
  }
}

export async function commitMigrateAction(
  csvText: string,
  mapping: ColumnMapping,
): Promise<MigrateCommitActionResult> {
  try {
    const session = await requireAdmin();
    const result = await commitMemberImport(
      csvText,
      mapping,
      session.user.id,
    );
    if (result.created === 0 && result.issues.length > 0) {
      return {
        ok: false,
        error: `Import blocked: ${result.issues[0]?.message ?? "validation errors"}.`,
      };
    }
    await writeAuditLog({
      actorId: session.user.id,
      action: "admin.members.import.commit",
      entityType: "System",
      metadata: {
        created: result.created,
        skipped: result.skipped,
      },
    });
    revalidatePath("/members");
    revalidatePath("/admin");
    revalidatePath("/admin/migrate");
    return { ok: true, ...result };
  } catch (e) {
    if (e instanceof AuthGuardError) return { ok: false, error: e.message };
    return { ok: false, error: "Import commit failed." };
  }
}

export async function getMigrateTemplateAction(): Promise<{
  ok: true;
  csv: string;
}> {
  await requireAdmin();
  return { ok: true, csv: memberImportTemplateCsv() };
}
