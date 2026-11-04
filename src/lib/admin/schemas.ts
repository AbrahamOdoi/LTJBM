import { z } from "zod";
import { ALL_ROLES } from "@/lib/roles";

const emptyToNull = (value: unknown) => {
  if (value === "" || value === undefined) return null;
  return value;
};

const roleEnum = z.enum(
  ALL_ROLES as unknown as [string, ...string[]],
);

export const domainListSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2, "Key is required")
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase snake_case keys"),
  label: z.string().trim().min(1, "Label is required").max(120),
  description: z.preprocess(
    emptyToNull,
    z.string().trim().max(500).nullable(),
  ),
});

export const domainValueSchema = z.object({
  domainListId: z.string().min(1),
  value: z
    .string()
    .trim()
    .min(1, "Value is required")
    .max(80)
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Invalid value token"),
  label: z.string().trim().min(1, "Label is required").max(120),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  parentValue: z.preprocess(
    emptyToNull,
    z.string().trim().max(80).nullable(),
  ),
  isActive: z.coerce.boolean().optional().default(true),
});

export const domainValueUpdateSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(120),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  parentValue: z.preprocess(
    emptyToNull,
    z.string().trim().max(80).nullable(),
  ),
  isActive: z.coerce.boolean(),
});

export const userCreateSchema = z.object({
  email: z.string().trim().email("Valid email required").max(160),
  name: z.string().trim().min(1, "Name is required").max(120),
  role: roleEnum,
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  branchIds: z.array(z.string().min(1)).optional().default([]),
  isActive: z.coerce.boolean().optional().default(true),
});

export const userUpdateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  role: roleEnum,
  isActive: z.coerce.boolean(),
  branchIds: z.array(z.string().min(1)).optional().default([]),
  password: z.preprocess(emptyToNull, z.string().min(8).max(128).nullable()),
});

export type DomainListInput = z.infer<typeof domainListSchema>;
export type DomainValueInput = z.infer<typeof domainValueSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
