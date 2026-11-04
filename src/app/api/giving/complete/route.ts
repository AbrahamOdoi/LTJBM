import { NextRequest, NextResponse } from "next/server";
import {
  completeOnlineGiving,
  GivingValidationError,
} from "@/lib/giving/service";

/**
 * Provider callback / webhook-style completion.
 * Idempotent: re-posts are no-ops once Paid.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const reference =
      String(body.reference || request.nextUrl.searchParams.get("reference") || "").trim();
    if (!reference) {
      return NextResponse.json({ error: "reference required" }, { status: 400 });
    }
    const result = await completeOnlineGiving(reference);
    return NextResponse.json({
      ok: true,
      paymentId: result.paymentId,
      alreadyPosted: result.alreadyPosted,
      status: result.checkout.status,
    });
  } catch (err) {
    if (err instanceof GivingValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/giving/complete]", err);
    return NextResponse.json({ error: "Complete failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference")?.trim() ?? "";
  if (!reference) {
    return NextResponse.json({ error: "reference required" }, { status: 400 });
  }
  try {
    const result = await completeOnlineGiving(reference);
    return NextResponse.json({
      ok: true,
      paymentId: result.paymentId,
      alreadyPosted: result.alreadyPosted,
      status: result.checkout.status,
    });
  } catch (err) {
    if (err instanceof GivingValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Complete failed" }, { status: 500 });
  }
}
