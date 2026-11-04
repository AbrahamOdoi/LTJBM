import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  GivingValidationError,
  startOnlineGiving,
} from "@/lib/giving/service";
import { assertSameOriginMutation } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    assertSameOriginMutation(request);
    const session = await auth();
    const body = await request.json();

    const authUrl = process.env.AUTH_URL?.trim() || request.nextUrl.origin;
    const result = await startOnlineGiving({
      amount: Number(body.amount),
      method: body.method,
      provider: body.provider,
      memberNumber: body.memberNumber,
      memberId: session?.user?.memberId ?? body.memberId ?? null,
      obligationId: body.obligationId,
      giftKindCode: body.giftKindCode,
      payerEmail: body.payerEmail,
      payerPhone: body.payerPhone,
      payerName: body.payerName,
      notes: body.notes,
      callbackBaseUrl: authUrl,
      actorId: session?.user?.id ?? null,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof GivingValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/giving/checkout]", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
