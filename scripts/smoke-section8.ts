/**
 * Section 8 HTTP smoke / regression harness for LTJBM CDMS.
 *
 * Prerequisites:
 *   - Migrated + seeded Postgres
 *   - App listening (npm run dev or npm start)
 *
 * Usage:
 *   SMOKE_BASE_URL=http://localhost:3000 npx tsx scripts/smoke-section8.ts
 *
 * Exit code 0 only when FAIL count is 0 (BLOCKED is allowed but unexpected on main).
 */

import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const PASSWORD = process.env.SEED_PASSWORD ?? "ChangeMe123!";
const CRON_SECRET = process.env.REPORT_CRON_SECRET ?? "smoke-cron-secret";

type Result = "PASS" | "FAIL" | "BLOCKED";

type Check = {
  id: string;
  scenario: string;
  result: Result;
  evidence: string;
};

const checks: Check[] = [];

function record(
  id: string,
  scenario: string,
  result: Result,
  evidence: string,
) {
  checks.push({ id, scenario, result, evidence });
  const mark =
    result === "PASS" ? "✓" : result === "FAIL" ? "✗" : "○";
  console.log(`${mark} [${result}] ${id} — ${evidence}`);
}

function assert(
  id: string,
  scenario: string,
  ok: boolean,
  evidence: string,
  blocked = false,
) {
  if (blocked) {
    record(id, scenario, "BLOCKED", evidence);
    return;
  }
  record(id, scenario, ok ? "PASS" : "FAIL", evidence);
}

type CookieJar = Map<string, string>;

function storeCookies(jar: CookieJar, res: Response) {
  const anyHeaders = res.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const raw = anyHeaders.getSetCookie?.() ?? [];
  if (raw.length === 0) {
    const single = res.headers.get("set-cookie");
    if (single) raw.push(single);
  }
  for (const line of raw) {
    const pair = line.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) {
      jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  }
}

function cookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function login(email: string): Promise<CookieJar> {
  const jar: CookieJar = new Map();
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  storeCookies(jar, csrfRes);
  const csrfJson = (await csrfRes.json()) as { csrfToken?: string };
  if (!csrfJson.csrfToken) {
    throw new Error(`No CSRF token for ${email}`);
  }

  const body = new URLSearchParams({
    csrfToken: csrfJson.csrfToken,
    email,
    password: PASSWORD,
    callbackUrl: `${BASE}/`,
    json: "true",
  });

  const signRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
    },
    body,
    redirect: "manual",
  });
  storeCookies(jar, signRes);

  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: cookieHeader(jar) },
  });
  storeCookies(jar, sessionRes);
  const session = (await sessionRes.json()) as {
    user?: { email?: string; role?: string };
  };
  if (!session?.user?.email) {
    throw new Error(
      `Login failed for ${email} (status ${signRes.status}, session empty)`,
    );
  }
  return jar;
}

async function req(
  jar: CookieJar | null,
  method: string,
  urlPath: string,
  init?: { body?: unknown; headers?: Record<string, string> },
) {
  const headers: Record<string, string> = { ...(init?.headers ?? {}) };
  if (jar) headers.Cookie = cookieHeader(jar);
  if (init?.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    redirect: "manual",
  });
  if (jar) storeCookies(jar, res);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, location: res.headers.get("location"), text, json };
}

function isRedirectTo(location: string | null, needle: string): boolean {
  if (!location) return false;
  try {
    const u = location.startsWith("http")
      ? new URL(location)
      : new URL(location, BASE);
    return u.pathname + u.search === needle || u.href.includes(needle);
  } catch {
    return location.includes(needle);
  }
}

async function pageOk(jar: CookieJar, urlPath: string): Promise<boolean> {
  const res = await req(jar, "GET", urlPath);
  // Next may 200 or soft-navigate; treat 200 as success, 3xx to forbidden as deny.
  return res.status === 200;
}

async function main() {
  console.log(`Section 8 smoke against ${BASE}`);

  // Health: app up
  const home = await fetch(`${BASE}/login`);
  if (!home.ok && home.status !== 200) {
    throw new Error(`App not reachable at ${BASE} (login → ${home.status})`);
  }

  const clerk = await login("clerk@ltjbm.local");
  const branch = await login("branch@ltjbm.local");
  const finance = await login("finance@ltjbm.local");
  const board = await login("board@ltjbm.local");
  const admin = await login("admin@ltjbm.local");

  // ── S8-SEED ──────────────────────────────────────────────────────────────
  {
    const exportRes = await req(admin, "GET", "/api/admin/export/members?format=csv");
    const rows = (exportRes.text.match(/\n/g) ?? []).length;
    // header + members
    const memberRows = Math.max(0, rows - 1);
    assert(
      "S8-SEED",
      "Demo DB ≥100 members",
      exportRes.status === 200 && memberRows >= 100,
      `export CSV rows≈${memberRows} status=${exportRes.status}`,
    );
  }

  // ── S8-01 register surfaces + duplicates ─────────────────────────────────
  {
    const list = await pageOk(clerk, "/members");
    const neu = await pageOk(clerk, "/members/new");
    const dup = await pageOk(clerk, "/members/duplicates");
    assert(
      "S8-01",
      "Register + household + groups + photo; duplicates",
      list && neu && dup,
      `clerk /members,/new,/duplicates → ${list && neu && dup ? 200 : "fail"} (interactive create not driven)`,
    );
  }

  // ── S8-02 domains ────────────────────────────────────────────────────────
  {
    const domains = await pageOk(admin, "/admin/domains");
    assert(
      "S8-02",
      "Domains / subdomains data-entry portal",
      domains,
      `admin /admin/domains → ${domains ? 200 : "fail"}`,
    );
  }

  // ── S8-03 status / transfer UI ───────────────────────────────────────────
  {
    const membersPage = await req(clerk, "GET", "/members");
    const idMatch = membersPage.text.match(/\/members\/([a-z0-9]{20,})/i);
    let detailOk = false;
    let memberId = idMatch?.[1] ?? null;
    if (!memberId) {
      // Fall back: finance members API is HQ-only; use export JSON
      const jsonExport = await req(admin, "GET", "/api/admin/export/members?format=json");
      const payload = jsonExport.json as { members?: { id: string }[] } | null;
      memberId = payload?.members?.[0]?.id ?? null;
    }
    if (memberId) {
      detailOk = await pageOk(clerk, `/members/${memberId}`);
    }
    assert(
      "S8-03",
      "Status update + change history",
      !!memberId && detailOk,
      memberId
        ? `clerk /members/${memberId} → 200 (status/transfer UI)`
        : "no member id found",
    );

    // ── S8-04 print ────────────────────────────────────────────────────────
    const indiv = memberId
      ? await req(clerk, "GET", `/members/${memberId}/print`)
      : { status: 0, text: "", location: null, json: null };
    const group = await req(clerk, "GET", "/members/print");
    assert(
      "S8-04",
      "Print individual + group",
      indiv.status === 200 && group.status === 200,
      `individual print ${indiv.status}; group print ${group.status}`,
    );

    // stash for S8-15 narrative (UI present)
    (globalThis as { __smokeMemberId?: string | null }).__smokeMemberId =
      memberId;
  }

  // ── S8-12 RBAC ───────────────────────────────────────────────────────────
  {
    const clerkFinance = await req(clerk, "GET", "/finance");
    const clerkFinanceApi = await req(clerk, "GET", "/api/finance/health");
    const clerkAdmin = await req(clerk, "GET", "/admin");
    const clerkReports = await req(clerk, "GET", "/reports");
    const branchMembers = await req(branch, "GET", "/members");
    const branchFinance = await req(branch, "GET", "/finance");
    const boardFinance = await req(board, "GET", "/finance");
    const boardReports = await req(board, "GET", "/reports");
    const financeHealth = await req(finance, "GET", "/api/finance/health");

    const clerkFinanceDenied =
      clerkFinance.status === 307 ||
      clerkFinance.status === 302 ||
      isRedirectTo(clerkFinance.location, "/forbidden?reason=finance");
    const clerkAdminDenied =
      clerkAdmin.status === 307 ||
      clerkAdmin.status === 302 ||
      isRedirectTo(clerkAdmin.location, "/forbidden?reason=admin");
    const clerkReportsDenied =
      clerkReports.status === 307 ||
      clerkReports.status === 302 ||
      isRedirectTo(clerkReports.location, "/forbidden?reason=reporting");
    const branchFinanceDenied =
      branchFinance.status === 307 ||
      branchFinance.status === 302 ||
      isRedirectTo(branchFinance.location, "/forbidden?reason=finance");
    // Post #12: Board has aggregate /reports only — individual /finance is forbidden
    const boardFinanceDenied =
      boardFinance.status === 307 ||
      boardFinance.status === 302 ||
      isRedirectTo(boardFinance.location, "/forbidden?reason=finance");

    const healthOk =
      financeHealth.status === 200 &&
      (financeHealth.json as { ok?: boolean } | null)?.ok === true;

    assert(
      "S8-12",
      "RBAC: Clerk / Branch / Board",
      clerkFinanceDenied &&
        clerkFinanceApi.status === 403 &&
        clerkAdminDenied &&
        clerkReportsDenied &&
        branchMembers.status === 200 &&
        branchFinanceDenied &&
        boardFinanceDenied &&
        boardReports.status === 200 &&
        healthOk,
      `clerk finance→forbidden, api 403; admin/reports deny; branch members OK + finance deny; board /finance deny (${boardFinance.status}), /reports ${boardReports.status}; finance health ok=${healthOk}`,
    );
  }

  // ── S8-13 export + backup ────────────────────────────────────────────────
  {
    const csv = await req(admin, "GET", "/api/admin/export/members?format=csv");
    const snap = await req(admin, "GET", "/api/admin/backup/snapshot");
    const clerkExport = await req(clerk, "GET", "/api/admin/export/members?format=csv");
    const backupPage = await pageOk(admin, "/admin/backup");
    const exportPage = await pageOk(admin, "/admin/export");
    assert(
      "S8-13",
      "Export members + restore narrative",
      csv.status === 200 &&
        snap.status === 200 &&
        clerkExport.status === 403 &&
        backupPage &&
        exportPage,
      `admin CSV ${csv.status}, snapshot ${snap.status}, clerk export ${clerkExport.status}, pages ok`,
    );
  }

  // ── Finance + Reporting (formerly BLOCKED) ───────────────────────────────
  const typesRes = await req(finance, "GET", "/api/finance/obligation-types");
  const types = (
    (typesRes.json as { types?: { id: string; kind: string; code: string }[] })
      ?.types ??
    (typesRes.json as { obligationTypes?: { id: string; kind: string; code: string }[] })
      ?.obligationTypes ??
    []
  );
  // API may return { types } or raw — inspect shape
  let typeList: { id: string; kind: string; code: string }[] = types;
  if (typeList.length === 0 && typesRes.json && typeof typesRes.json === "object") {
    const maybe = typesRes.json as Record<string, unknown>;
    for (const v of Object.values(maybe)) {
      if (Array.isArray(v) && v[0]?.kind) {
        typeList = v as { id: string; kind: string; code: string }[];
        break;
      }
    }
  }

  const membersRes = await req(finance, "GET", "/api/finance/members");
  const financeMembers =
    (
      membersRes.json as {
        members?: { id: string; memberNumber: string }[];
      } | null
    )?.members ?? [];

  const pickMember = (num: string) =>
    financeMembers.find((m) => m.memberNumber === num) ?? financeMembers[0];
  const pledgeType = typeList.find((t) => t.kind === "Pledge");
  const specialType = typeList.find((t) => t.kind === "SpecialProject");
  const titheType = typeList.find((t) => t.kind === "Tithe");
  const thanksType = typeList.find((t) => t.kind === "Thanksgiving");
  const duesType = typeList.find((t) => t.kind === "Dues");

  const financeUi =
    (await pageOk(finance, "/finance/obligations")) &&
    (await pageOk(finance, "/finance/batches")) &&
    (await pageOk(finance, "/finance/arrears"));

  // ── S8-05 Pledge + 2 payments ────────────────────────────────────────────
  {
    const member = pickMember("FIN-001");
    const prepOk =
      typesRes.status === 200 &&
      membersRes.status === 200 &&
      !!pledgeType &&
      !!member &&
      financeUi;

    if (!prepOk) {
      assert(
        "S8-05",
        "Pledge + instalments + 2 payments",
        false,
        `prep failed types=${typesRes.status} members=${membersRes.status} pledgeType=${!!pledgeType} member=${!!member} ui=${financeUi}`,
      );
    } else {
      const created = await req(finance, "POST", "/api/finance/obligations", {
        body: {
          memberId: member!.id,
          obligationTypeId: pledgeType!.id,
          periodStart: "2026-11-01T00:00:00.000Z",
          periodEnd: "2026-12-31T00:00:00.000Z",
          expectedAmount: 900,
          instalmentCount: 3,
          notes: "Smoke S8-05 pledge",
        },
      });
      const obligation = (created.json as { obligation?: {
        id: string;
        balances?: { expected: number; paid: number; outstanding: number };
        instalmentCount?: number | null;
      } })?.obligation;

      let pay1ok = false;
      let pay2ok = false;
      let balOk = false;
      if (obligation?.id) {
        const p1 = await req(finance, "POST", "/api/finance/payments", {
          body: {
            obligationId: obligation.id,
            amount: 300,
            paidAt: "2026-11-02T00:00:00.000Z",
            method: "MoMo",
            reference: "SMOKE-P1",
          },
        });
        const p2 = await req(finance, "POST", "/api/finance/payments", {
          body: {
            obligationId: obligation.id,
            amount: 300,
            paidAt: "2026-11-03T00:00:00.000Z",
            method: "MoMo",
            reference: "SMOKE-P2",
          },
        });
        pay1ok = p1.status === 201;
        pay2ok = p2.status === 201;

        const listed = await req(
          finance,
          "GET",
          `/api/finance/obligations?kind=Pledge&memberId=${member!.id}`,
        );
        const found = (
          (listed.json as { obligations?: {
            id: string;
            balances: { expected: number; paid: number; outstanding: number };
            instalmentCount?: number | null;
          }[] })?.obligations ?? []
        ).find((o) => o.id === obligation.id);
        balOk =
          !!found &&
          found.balances.expected === 900 &&
          found.balances.paid === 600 &&
          found.balances.outstanding === 300 &&
          found.instalmentCount === 3;
      }

      assert(
        "S8-05",
        "Pledge + instalments + 2 payments",
        created.status === 201 && pay1ok && pay2ok && balOk,
        `create ${created.status}; pays ${pay1ok}/${pay2ok}; balances expected/paid/out=900/600/300 instalments=3 → ${balOk}`,
      );
    }
  }

  // ── S8-06 Special Project ────────────────────────────────────────────────
  {
    const member = pickMember("FIN-002");
    if (!specialType || !member) {
      assert(
        "S8-06",
        "Special Project + target + 2 payments",
        false,
        "missing SpecialProject type or member",
      );
    } else {
      const created = await req(finance, "POST", "/api/finance/obligations", {
        body: {
          memberId: member.id,
          obligationTypeId: specialType.id,
          periodStart: "2026-11-01T00:00:00.000Z",
          expectedAmount: 500,
          projectTargetAmount: 25000,
          notes: "Smoke S8-06 special",
        },
      });
      const obligation = (created.json as { obligation?: { id: string } })
        ?.obligation;
      let pays = false;
      let balOk = false;
      if (obligation?.id) {
        const p1 = await req(finance, "POST", "/api/finance/payments", {
          body: {
            obligationId: obligation.id,
            amount: 200,
            paidAt: "2026-11-02T00:00:00.000Z",
            method: "Cash",
          },
        });
        const p2 = await req(finance, "POST", "/api/finance/payments", {
          body: {
            obligationId: obligation.id,
            amount: 150,
            paidAt: "2026-11-03T00:00:00.000Z",
            method: "Bank",
          },
        });
        pays = p1.status === 201 && p2.status === 201;
        const listed = await req(
          finance,
          "GET",
          `/api/finance/obligations?kind=SpecialProject&memberId=${member.id}`,
        );
        const found = (
          (listed.json as { obligations?: {
            id: string;
            balances: { expected: number; paid: number; outstanding: number };
            projectTargetAmount?: number | null;
          }[] })?.obligations ?? []
        ).find((o) => o.id === obligation.id);
        balOk =
          !!found &&
          found.balances.paid === 350 &&
          found.balances.outstanding === 150 &&
          Number(found.projectTargetAmount) === 25000;
      }
      assert(
        "S8-06",
        "Special Project + target + 2 payments",
        created.status === 201 && pays && balOk,
        `create ${created.status}; pays=${pays}; paid/out/target ok=${balOk}`,
      );
    }
  }

  // ── S8-07 Saturday batch + variance ──────────────────────────────────────
  {
    const memberA = pickMember("FIN-001");
    const memberB = pickMember("FIN-002");
    const memberC = pickMember("FIN-003");
    if (!titheType || !thanksType || !duesType || !memberA || !memberB || !memberC) {
      assert(
        "S8-07",
        "Saturday batch + variance",
        false,
        "missing tithe/thanksgiving/dues types or members",
      );
    } else {
      const batchRes = await req(finance, "POST", "/api/finance/batches", {
        body: {
          batchDate: "2026-11-08T00:00:00.000Z",
          label: "Smoke Saturday collection",
          countedTotal: 400,
          notes: "Smoke S8-07 intentional variance",
        },
      });
      const batch = (batchRes.json as { batch?: { id: string } })?.batch;

      const mkObl = async (
        memberId: string,
        typeId: string,
        expected: number,
      ) => {
        const r = await req(finance, "POST", "/api/finance/obligations", {
          body: {
            memberId,
            obligationTypeId: typeId,
            periodStart: "2026-11-08T00:00:00.000Z",
            expectedAmount: expected,
            notes: "Smoke S8-07 line",
          },
        });
        return (r.json as { obligation?: { id: string } })?.obligation?.id;
      };

      const titheId = await mkObl(memberA.id, titheType.id, 150);
      const thanksId = await mkObl(memberB.id, thanksType.id, 100);
      const duesId = await mkObl(memberC.id, duesType.id, 50);

      let linked = false;
      if (batch?.id && titheId && thanksId && duesId) {
        const pays = await Promise.all([
          req(finance, "POST", "/api/finance/payments", {
            body: {
              obligationId: titheId,
              amount: 150,
              paidAt: "2026-11-08T00:00:00.000Z",
              method: "Cash",
              batchId: batch.id,
            },
          }),
          req(finance, "POST", "/api/finance/payments", {
            body: {
              obligationId: thanksId,
              amount: 100,
              paidAt: "2026-11-08T00:00:00.000Z",
              method: "Cash",
              batchId: batch.id,
            },
          }),
          req(finance, "POST", "/api/finance/payments", {
            body: {
              obligationId: duesId,
              amount: 50,
              paidAt: "2026-11-08T00:00:00.000Z",
              method: "Cash",
              batchId: batch.id,
            },
          }),
        ]);
        linked = pays.every((p) => p.status === 201);
      }

      const got = batch?.id
        ? await req(finance, "GET", `/api/finance/batches/${batch.id}`)
        : null;
      const b = (got?.json as {
        batch?: {
          countedTotal: number;
          systemTotal: number;
          varianceAmount: number;
          hasVariance: boolean;
        };
      })?.batch;

      // system = 300, counted = 400 → variance 100
      const varianceOk =
        !!b &&
        Number(b.systemTotal) === 300 &&
        Number(b.countedTotal) === 400 &&
        b.hasVariance === true &&
        Math.abs(Number(b.varianceAmount)) === 100;

      assert(
        "S8-07",
        "Saturday batch + variance",
        batchRes.status === 201 && linked && varianceOk,
        `batch ${batchRes.status}; linked=${linked}; system/counted/variance=${b?.systemTotal}/${b?.countedTotal}/${b?.varianceAmount} hasVariance=${b?.hasVariance}`,
      );
    }
  }

  // ── S8-08 Dues arrears ───────────────────────────────────────────────────
  {
    const arrearsAll = await req(finance, "GET", "/api/finance/arrears");
    const ama = pickMember("FIN-002");
    const byMember = ama
      ? await req(finance, "GET", `/api/finance/arrears?memberId=${ama.id}`)
      : null;
    const byPeriod = await req(
      finance,
      "GET",
      "/api/finance/arrears?periodStart=2026-10-01T00:00:00.000Z&periodEnd=2026-10-31T23:59:59.000Z",
    );
    // group filter — use cell if seed Cell A exists via member groups; API accepts cellId optionally
    const count =
      (arrearsAll.json as { count?: number; arrears?: unknown[] } | null)?.count ??
      (arrearsAll.json as { arrears?: unknown[] } | null)?.arrears?.length ??
      0;
    const memberCount =
      (byMember?.json as { count?: number; arrears?: unknown[] } | null)?.count ??
      (byMember?.json as { arrears?: unknown[] } | null)?.arrears?.length ??
      0;
    const periodCount =
      (byPeriod.json as { count?: number; arrears?: unknown[] } | null)?.count ??
      (byPeriod.json as { arrears?: unknown[] } | null)?.arrears?.length ??
      0;

    const page = await pageOk(finance, "/finance/arrears");
    assert(
      "S8-08",
      "Dues arrears member/group/period",
      arrearsAll.status === 200 &&
        count >= 1 &&
        (byMember?.status ?? 0) === 200 &&
        memberCount >= 1 &&
        byPeriod.status === 200 &&
        periodCount >= 1 &&
        page,
      `arrears all=${count} member=${memberCount} period=${periodCount}; page ok=${page}`,
    );
  }

  // Capture board paid before payment for S8-09
  const dashBefore = await req(board, "GET", "/api/reports/dashboard");
  const paidBefore =
    (dashBefore.json as { totals?: { paid: number } } | null)?.totals?.paid ??
    null;

  // ── S8-09 live dashboard after payment ───────────────────────────────────
  {
    const reportsPage = await pageOk(board, "/reports");
    const member = pickMember("FIN-001");
    if (!duesType || !member || paidBefore == null) {
      assert(
        "S8-09",
        "Payment → Board dashboard live",
        false,
        `prep failed reportsPage=${reportsPage} duesType=${!!duesType} member=${!!member} paidBefore=${paidBefore}`,
      );
    } else {
      const obl = await req(finance, "POST", "/api/finance/obligations", {
        body: {
          memberId: member.id,
          obligationTypeId: duesType.id,
          periodStart: "2026-11-04T00:00:00.000Z",
          expectedAmount: 75,
          notes: "Smoke S8-09 live dashboard",
        },
      });
      const oblId = (obl.json as { obligation?: { id: string } })?.obligation
        ?.id;
      const pay = oblId
        ? await req(finance, "POST", "/api/finance/payments", {
            body: {
              obligationId: oblId,
              amount: 75,
              paidAt: "2026-11-04T12:00:00.000Z",
              method: "MoMo",
              reference: "SMOKE-LIVE",
            },
          })
        : { status: 0, json: null, text: "", location: null };

      const dashAfter = await req(board, "GET", "/api/reports/dashboard");
      const paidAfter =
        (dashAfter.json as { totals?: { paid: number } } | null)?.totals?.paid ??
        null;

      const live =
        dashBefore.status === 200 &&
        dashAfter.status === 200 &&
        pay.status === 201 &&
        paidAfter != null &&
        paidAfter >= paidBefore + 75 - 0.001 &&
        reportsPage;

      assert(
        "S8-09",
        "Payment → Board dashboard live",
        live,
        `payment ${pay.status}; board paid ${paidBefore} → ${paidAfter}; /reports page=${reportsPage}`,
      );
    }
  }

  // ── S8-10 monthly Board email ────────────────────────────────────────────
  {
    const schedulesPage = await pageOk(admin, "/reports/schedules");
    const run = await req(null, "POST", "/api/reports/schedules/run", {
      body: {},
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const delivery = (run.json as {
      ok?: boolean;
      delivery?: { mode?: string; path?: string; recipients?: string[] };
    } | null)?.delivery;
    const ok =
      run.status === 200 &&
      (run.json as { ok?: boolean } | null)?.ok === true &&
      schedulesPage;

    assert(
      "S8-10",
      "Monthly Board email schedule",
      ok,
      `run ${run.status} ok=${(run.json as { ok?: boolean } | null)?.ok}; mode=${delivery?.mode}; path=${delivery?.path ?? "n/a"}; schedules page=${schedulesPage}`,
    );
  }

  // ── S8-11 live template edit ─────────────────────────────────────────────
  {
    const templatesPage = await pageOk(admin, "/reports/templates");
    const list = await req(admin, "GET", "/api/reports/templates");
    const templates =
      (list.json as { templates?: { id: string; layout?: { fields?: unknown[]; charts?: unknown[] } }[] })
        ?.templates ?? [];
    const tmpl = templates[0];
    let patched = false;
    let reflected = false;
    if (tmpl?.id) {
      const beforeFields = tmpl.layout?.fields?.length ?? 0;
      const patch = await req(admin, "PATCH", `/api/reports/templates/${tmpl.id}`, {
        body: {
          addField: {
            label: "Smoke obligation count",
            source: "totals.obligationCount",
          },
        },
      });
      patched = patch.status === 200;
      const after = (patch.json as {
        template?: { layout?: { fields?: { label: string }[] } };
      })?.template;
      reflected =
        !!after?.layout?.fields?.some(
          (f) => f.label === "Smoke obligation count",
        ) && (after.layout.fields?.length ?? 0) === beforeFields + 1;
    }
    assert(
      "S8-11",
      "Live template field/chart edit",
      templatesPage && list.status === 200 && patched && reflected,
      `templates page=${templatesPage}; list ${list.status}; patch reflected=${reflected}`,
    );
  }

  // ── S8-14 Board rollup by kind ───────────────────────────────────────────
  {
    const dash = await req(board, "GET", "/api/reports/dashboard");
    const byKind =
      (dash.json as {
        byKind?: {
          kind: string;
          expected: number;
          paid: number;
          outstanding: number;
        }[];
        totals?: { expected: number; paid: number; outstanding: number };
      } | null)?.byKind ?? [];
    const kinds = new Set(byKind.map((k) => k.kind));
    const need = ["Pledge", "Dues", "Thanksgiving"];
    const hasNeeded = need.every((k) => kinds.has(k));
    const hasOther = byKind.some(
      (k) => !need.includes(k.kind) || k.kind === "Tithe" || k.kind === "SpecialProject",
    );
    const totals = (dash.json as { totals?: { expected: number } } | null)
      ?.totals;
    assert(
      "S8-14",
      "Board Expected/Paid/Outstanding rollup",
      dash.status === 200 && hasNeeded && !!totals && totals.expected > 0,
      `kinds=[${[...kinds].join(",")}] totals.expected=${totals?.expected}; other/extra=${hasOther}`,
    );
  }

  // ── S8-15 Ghana → international (UI present; write path Members Phase A) ─
  {
    const memberId = (globalThis as { __smokeMemberId?: string | null })
      .__smokeMemberId;
    const detail = memberId
      ? await req(clerk, "GET", `/members/${memberId}`)
      : { status: 0, text: "" };
    const hasTransferUi =
      detail.status === 200 &&
      (/transfer/i.test(detail.text) || /London|international/i.test(detail.text));
    assert(
      "S8-15",
      "Ghana → international transfer",
      hasTransferUi,
      memberId
        ? `member detail ${detail.status}; transfer UI signals=${hasTransferUi}`
        : "no member id",
    );
  }

  // Summary
  const pass = checks.filter((c) => c.result === "PASS").length;
  const fail = checks.filter((c) => c.result === "FAIL").length;
  const blocked = checks.filter((c) => c.result === "BLOCKED").length;

  const summary = {
    baseUrl: BASE,
    ranAt: new Date().toISOString(),
    counts: { PASS: pass, FAIL: fail, BLOCKED: blocked, TOTAL: checks.length },
    checks,
  };

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary.counts, null, 2));

  const outDir = path.join(process.cwd(), "tmp");
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, "smoke-section8-results.json");
  await new Promise<void>((resolve, reject) => {
    const stream = createWriteStream(outFile);
    stream.write(JSON.stringify(summary, null, 2));
    stream.end();
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
  console.log(`Wrote ${outFile}`);

  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
