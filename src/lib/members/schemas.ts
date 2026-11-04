import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (value === "" || value === undefined) return null;
  return value;
};

export const memberBiodataSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  otherNames: z.preprocess(emptyToNull, z.string().trim().max(120).nullable()),
  dateOfBirth: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
      .nullable(),
  ),
  gender: z.preprocess(emptyToNull, z.string().trim().max(40).nullable()),
  phone: z.preprocess(emptyToNull, z.string().trim().max(40).nullable()),
  email: z.preprocess(
    emptyToNull,
    z.string().trim().email("Invalid email").nullable(),
  ),
  addressLine1: z.preprocess(emptyToNull, z.string().trim().max(160).nullable()),
  addressLine2: z.preprocess(emptyToNull, z.string().trim().max(160).nullable()),
  city: z.preprocess(emptyToNull, z.string().trim().max(80).nullable()),
  region: z.preprocess(emptyToNull, z.string().trim().max(80).nullable()),
  country: z.preprocess(emptyToNull, z.string().trim().max(80).nullable()),
  branchId: z.string().min(1, "Branch is required"),
  cellId: z.preprocess(emptyToNull, z.string().nullable()),
  fellowshipMinistryId: z.preprocess(emptyToNull, z.string().nullable()),
  householdName: z.preprocess(emptyToNull, z.string().trim().max(120).nullable()),
  householdRelation: z.enum(["Head", "Spouse", "Child", "Dependent", "Other"]).optional(),
  forceCreate: z.coerce.boolean().optional().default(false),
});

export const memberStatusSchema = z.object({
  memberId: z.string().min(1),
  toStatus: z.enum(["Active", "Inactive", "Transferred", "Deceased", "Suspended"]),
  reason: z.preprocess(emptyToNull, z.string().trim().max(500).nullable()),
});

export const memberTransferSchema = z.object({
  memberId: z.string().min(1),
  toBranchId: z.string().min(1, "Destination branch is required"),
  reason: z.preprocess(emptyToNull, z.string().trim().max(500).nullable()),
});

export const duplicateReviewSchema = z.object({
  candidateId: z.string().min(1),
  status: z.enum(["ConfirmedDuplicate", "Dismissed"]),
});

export type MemberBiodataInput = z.infer<typeof memberBiodataSchema>;
