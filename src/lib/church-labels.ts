/** Church-native display labels for Prisma/enum values (UI only). */

const OBLIGATION_KIND_LABELS: Record<string, string> = {
  Pledge: "Pledge",
  Tithe: "Tithe",
  Dues: "Dues",
  SpecialProject: "Special Project",
  Thanksgiving: "Thanksgiving",
};

export function obligationKindLabel(kind: string | null | undefined): string {
  if (!kind) return "—";
  return OBLIGATION_KIND_LABELS[kind] ?? kind.replace(/([a-z])([A-Z])/g, "$1 $2");
}

const MINISTRY_GROUP_KIND_LABELS: Record<string, string> = {
  Cell: "Cell",
  Fellowship: "Fellowship",
  Choir: "Choir",
  Usher: "Ushers",
  Youth: "Youth",
  Department: "Department",
  Other: "Other group",
};

export function ministryGroupKindLabel(kind: string | null | undefined): string {
  if (!kind) return "—";
  return MINISTRY_GROUP_KIND_LABELS[kind] ?? kind;
}
