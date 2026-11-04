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
