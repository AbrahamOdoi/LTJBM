import { NextResponse } from "next/server";
import { AuthGuardError, requireSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { getScopedBranchIds } from "@/lib/members/access";
import { getMemberPhotoBytes } from "@/lib/storage/photos-backend";
import { Role } from "@/lib/roles";

type Params = { params: Promise<{ key: string }> };

/**
 * Branch-scoped (and role-aware) photo proxy.
 * Replaces direct `/uploads/members/*` static access for PII photos.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { key: rawKey } = await params;
    const key = decodeURIComponent(rawKey);

    if (!key || key.includes("..") || key.includes("/") || key.startsWith("demo-")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const member = await prisma.member.findFirst({
      where: { photoKey: key },
      select: { id: true, branchId: true },
    });

    if (!member) {
      // Allow orphaned keys only for Admin (ops cleanup / restore drills).
      if (session.user.role !== Role.Admin) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    } else {
      const role = session.user.role;

      if (role === Role.Member) {
        if (session.user.memberId !== member.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else {
        const scoped = await getScopedBranchIds({
          id: session.user.id,
          role,
        });
        if (scoped !== null && !scoped.includes(member.branchId)) {
          return NextResponse.json(
            { error: "Photo is outside your branch scope" },
            { status: 403 },
          );
        }
      }
    }

    const file = await getMemberPhotoBytes(key);
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.body), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof AuthGuardError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Photo fetch failed" }, { status: 500 });
  }
}
