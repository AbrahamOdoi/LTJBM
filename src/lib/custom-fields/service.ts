import type { CustomFieldType, Prisma } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

function slugKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export async function listCustomFieldDefinitions(opts?: {
  activeOnly?: boolean;
}) {
  return prisma.customFieldDefinition.findMany({
    where: opts?.activeOnly === false ? undefined : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
}

export async function createCustomFieldDefinition(input: {
  label: string;
  key?: string | null;
  fieldType: CustomFieldType;
  options?: string[] | null;
  helpText?: string | null;
  isRequired?: boolean;
  sortOrder?: number;
  actorId: string;
}) {
  const key = (input.key?.trim() || slugKey(input.label) || `field_${Date.now()}`).slice(
    0,
    64,
  );
  const field = await prisma.customFieldDefinition.create({
    data: {
      key,
      label: input.label.trim(),
      fieldType: input.fieldType,
      optionsJson:
        input.options && input.options.length > 0
          ? (input.options as Prisma.InputJsonValue)
          : undefined,
      helpText: input.helpText ?? null,
      isRequired: input.isRequired ?? false,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  await writeAuditLog({
    actorId: input.actorId,
    action: "custom_field.create",
    entityType: "CustomFieldDefinition",
    entityId: field.id,
    metadata: { key: field.key, fieldType: field.fieldType },
  });
  return field;
}

export async function setCustomFieldActive(
  id: string,
  isActive: boolean,
  actorId: string,
) {
  const field = await prisma.customFieldDefinition.update({
    where: { id },
    data: { isActive },
  });
  await writeAuditLog({
    actorId,
    action: isActive ? "custom_field.activate" : "custom_field.deactivate",
    entityType: "CustomFieldDefinition",
    entityId: id,
  });
  return field;
}

export async function getMemberCustomFieldValues(memberId: string) {
  const [definitions, values] = await Promise.all([
    listCustomFieldDefinitions({ activeOnly: true }),
    prisma.memberCustomFieldValue.findMany({
      where: { memberId },
    }),
  ]);
  const byField = new Map(values.map((v) => [v.fieldId, v]));
  return definitions.map((d) => ({
    definition: d,
    value: byField.get(d.id)?.valueText ?? "",
    valueId: byField.get(d.id)?.id ?? null,
  }));
}

export async function upsertMemberCustomFields(input: {
  memberId: string;
  values: Array<{ fieldId: string; valueText: string | null }>;
  actorId: string;
}) {
  await prisma.$transaction(async (tx) => {
    for (const row of input.values) {
      const text = row.valueText?.trim() || null;
      if (text == null || text === "") {
        await tx.memberCustomFieldValue.deleteMany({
          where: { memberId: input.memberId, fieldId: row.fieldId },
        });
        continue;
      }
      await tx.memberCustomFieldValue.upsert({
        where: {
          memberId_fieldId: {
            memberId: input.memberId,
            fieldId: row.fieldId,
          },
        },
        create: {
          memberId: input.memberId,
          fieldId: row.fieldId,
          valueText: text,
        },
        update: { valueText: text },
      });
    }
    await writeAuditLog(
      {
        actorId: input.actorId,
        action: "member.custom_fields_update",
        entityType: "Member",
        entityId: input.memberId,
        metadata: { fieldCount: input.values.length },
      },
      tx,
    );
  });
}
