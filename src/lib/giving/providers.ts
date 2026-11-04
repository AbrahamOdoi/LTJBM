/**
 * Online giving provider adapters — Paystack, MoMo (MTN-style), Demo.
 * Secrets stay in env; never commit keys. Demo mode when credentials absent.
 */

export type GivingMethod = "MoMo" | "Card" | "Bank";
export type GivingProviderId = "Paystack" | "MoMo" | "Demo";

export type ProviderStatus = {
  id: GivingProviderId;
  label: string;
  configured: boolean;
  demoFallback: boolean;
  notes: string;
  supportedMethods: GivingMethod[];
};

export type InitiateCheckoutInput = {
  reference: string;
  amountGhs: number;
  currency: string;
  method: GivingMethod;
  email?: string | null;
  phone?: string | null;
  callbackUrl: string;
};

export type InitiateCheckoutResult = {
  provider: GivingProviderId;
  demoMode: boolean;
  authorizationUrl: string;
  providerRef: string | null;
};

export type VerifyCheckoutResult = {
  success: boolean;
  providerRef: string | null;
  amountGhs: number | null;
  rawStatus: string;
};

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function paystackConfigured(): boolean {
  return Boolean(env("PAYSTACK_SECRET_KEY"));
}

export function momoConfigured(): boolean {
  return Boolean(env("MOMO_API_KEY") && env("MOMO_SUBSCRIPTION_KEY"));
}

export function listGivingProviders(): ProviderStatus[] {
  const paystackOk = paystackConfigured();
  const momoOk = momoConfigured();
  return [
    {
      id: "Paystack",
      label: "Paystack (card / bank / MoMo)",
      configured: paystackOk,
      demoFallback: !paystackOk,
      notes: paystackOk
        ? "Live — PAYSTACK_SECRET_KEY present."
        : "Demo mode — set PAYSTACK_SECRET_KEY (+ optional PAYSTACK_PUBLIC_KEY).",
      supportedMethods: ["Card", "Bank", "MoMo"],
    },
    {
      id: "MoMo",
      label: "MTN MoMo Collection",
      configured: momoOk,
      demoFallback: !momoOk,
      notes: momoOk
        ? "Live — MoMo API credentials present."
        : "Demo mode — set MOMO_API_KEY + MOMO_SUBSCRIPTION_KEY (+ MOMO_TARGET_ENV).",
      supportedMethods: ["MoMo"],
    },
    {
      id: "Demo",
      label: "Demo sandbox",
      configured: true,
      demoFallback: false,
      notes: "Always available. Completes locally and posts to HQ ledger without a gateway.",
      supportedMethods: ["MoMo", "Card", "Bank"],
    },
  ];
}

export function resolveProvider(
  preferred: GivingProviderId | string | null | undefined,
  method: GivingMethod,
): GivingProviderId {
  const raw = (preferred ?? "").trim();
  if (raw === "Demo") return "Demo";
  if (raw === "MoMo") {
    if (method !== "MoMo") return paystackConfigured() ? "Paystack" : "Demo";
    return momoConfigured() ? "MoMo" : "Demo";
  }
  if (raw === "Paystack") {
    return paystackConfigured() ? "Paystack" : "Demo";
  }
  // Auto: prefer live provider for method
  if (method === "MoMo" && momoConfigured()) return "MoMo";
  if (paystackConfigured()) return "Paystack";
  if (method === "MoMo" && momoConfigured()) return "MoMo";
  return "Demo";
}

export async function initiateCheckout(
  provider: GivingProviderId,
  input: InitiateCheckoutInput,
): Promise<InitiateCheckoutResult> {
  if (provider === "Paystack" && paystackConfigured()) {
    return initiatePaystack(input);
  }
  if (provider === "MoMo" && momoConfigured()) {
    return initiateMoMo(input);
  }
  return initiateDemo(input);
}

export async function verifyCheckout(
  provider: GivingProviderId,
  reference: string,
  demoMode: boolean,
): Promise<VerifyCheckoutResult> {
  if (demoMode || provider === "Demo") {
    return {
      success: true,
      providerRef: `demo-${reference}`,
      amountGhs: null,
      rawStatus: "demo_success",
    };
  }
  if (provider === "Paystack") {
    return verifyPaystack(reference);
  }
  if (provider === "MoMo") {
    return verifyMoMo(reference);
  }
  return {
    success: false,
    providerRef: null,
    amountGhs: null,
    rawStatus: "unknown_provider",
  };
}

async function initiateDemo(
  input: InitiateCheckoutInput,
): Promise<InitiateCheckoutResult> {
  const url = new URL(input.callbackUrl);
  url.searchParams.set("reference", input.reference);
  url.searchParams.set("demo", "1");
  return {
    provider: "Demo",
    demoMode: true,
    authorizationUrl: url.toString(),
    providerRef: `demo-init-${input.reference}`,
  };
}

async function initiatePaystack(
  input: InitiateCheckoutInput,
): Promise<InitiateCheckoutResult> {
  const amountPesewas = Math.round(input.amountGhs * 100);
  const channels =
    input.method === "MoMo"
      ? ["mobile_money"]
      : input.method === "Bank"
        ? ["bank", "bank_transfer"]
        : ["card"];

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("PAYSTACK_SECRET_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email || "giving@ltjbm.local",
      amount: amountPesewas,
      currency: input.currency || "GHS",
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels,
      metadata: {
        method: input.method,
        phone: input.phone ?? undefined,
        hq_ledger_only: true,
      },
    }),
  });

  const data = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string; access_code?: string };
  };

  if (!res.ok || !data.status || !data.data?.authorization_url) {
    console.warn(
      "[giving] Paystack init failed — falling back to demo:",
      data.message ?? res.status,
    );
    return initiateDemo(input);
  }

  return {
    provider: "Paystack",
    demoMode: false,
    authorizationUrl: data.data.authorization_url,
    providerRef: data.data.access_code ?? data.data.reference ?? null,
  };
}

async function verifyPaystack(reference: string): Promise<VerifyCheckoutResult> {
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${env("PAYSTACK_SECRET_KEY")}`,
      },
    },
  );
  const data = (await res.json()) as {
    status?: boolean;
    data?: {
      status?: string;
      amount?: number;
      id?: number;
      reference?: string;
    };
  };
  const ok =
    Boolean(data.status) &&
    (data.data?.status === "success" || data.data?.status === "successful");
  return {
    success: ok,
    providerRef: data.data?.id != null ? String(data.data.id) : data.data?.reference ?? null,
    amountGhs:
      typeof data.data?.amount === "number" ? data.data.amount / 100 : null,
    rawStatus: data.data?.status ?? `http_${res.status}`,
  };
}

async function initiateMoMo(
  input: InitiateCheckoutInput,
): Promise<InitiateCheckoutResult> {
  const base =
    env("MOMO_API_BASE") ||
    "https://sandbox.momodeveloper.mtn.com/collection/v1_0";
  const targetEnv = env("MOMO_TARGET_ENV") || "sandbox";
  const uuid = crypto.randomUUID();

  const res = await fetch(`${base}/requesttopay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("MOMO_API_KEY")}`,
      "X-Reference-Id": uuid,
      "X-Target-Environment": targetEnv,
      "Ocp-Apim-Subscription-Key": env("MOMO_SUBSCRIPTION_KEY"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountGhs.toFixed(2),
      currency: input.currency || "EUR",
      externalId: input.reference,
      payer: {
        partyIdType: "MSISDN",
        partyId: (input.phone || "").replace(/\D/g, "") || "233000000000",
      },
      payerMessage: "LTJBM contribution",
      payeeNote: "HQ ledger",
    }),
  });

  if (!res.ok && res.status !== 202) {
    console.warn(
      "[giving] MoMo requesttopay failed — falling back to demo:",
      res.status,
    );
    return initiateDemo(input);
  }

  // MoMo is async; callback URL completes verification.
  const callback = new URL(input.callbackUrl);
  callback.searchParams.set("reference", input.reference);
  callback.searchParams.set("momoRef", uuid);

  return {
    provider: "MoMo",
    demoMode: false,
    authorizationUrl: callback.toString(),
    providerRef: uuid,
  };
}

async function verifyMoMo(reference: string): Promise<VerifyCheckoutResult> {
  const base =
    env("MOMO_API_BASE") ||
    "https://sandbox.momodeveloper.mtn.com/collection/v1_0";
  const targetEnv = env("MOMO_TARGET_ENV") || "sandbox";

  // Look up checkout providerRef via caller — here we poll by external id path if available.
  // Callers pass providerRef as reference when known; otherwise treat as pending success in sandbox.
  const res = await fetch(`${base}/requesttopay/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${env("MOMO_API_KEY")}`,
      "X-Target-Environment": targetEnv,
      "Ocp-Apim-Subscription-Key": env("MOMO_SUBSCRIPTION_KEY"),
    },
  });

  if (!res.ok) {
    return {
      success: false,
      providerRef: reference,
      amountGhs: null,
      rawStatus: `http_${res.status}`,
    };
  }

  const data = (await res.json()) as {
    status?: string;
    amount?: string;
    financialTransactionId?: string;
  };
  const ok = data.status === "SUCCESSFUL";
  return {
    success: ok,
    providerRef: data.financialTransactionId ?? reference,
    amountGhs: data.amount ? Number(data.amount) : null,
    rawStatus: data.status ?? "unknown",
  };
}
