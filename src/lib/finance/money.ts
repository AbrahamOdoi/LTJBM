import { Prisma } from "@prisma/client";

/** Round to 2 decimal places (GH₵). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toMoneyNumber(
  value: Prisma.Decimal | number | string | null | undefined,
): number {
  if (value == null) return 0;
  if (typeof value === "number") return roundMoney(value);
  if (typeof value === "string") return roundMoney(Number(value));
  return roundMoney(Number(value.toString()));
}

export function sumMoney(
  amounts: Array<Prisma.Decimal | number | string>,
): number {
  return roundMoney(amounts.reduce<number>((acc, a) => acc + toMoneyNumber(a), 0));
}

export function decimalFromNumber(value: number): Prisma.Decimal {
  return new Prisma.Decimal(roundMoney(value).toFixed(2));
}

export function formatGhs(value: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(roundMoney(value));
}
