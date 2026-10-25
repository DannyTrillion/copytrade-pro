/**
 * PayMeGate merchant API client.
 *
 * SERVER ONLY. The API key authorises order creation and settlement reads for
 * the whole tenant — it must never reach the browser, and no route may proxy
 * it. Orders are created here and the user is sent to the returned
 * `checkoutUrl`; card details are entered on the gateway's domain.
 *
 * SECURITY MODEL — why `getOrder` exists:
 * PayMeGate's `order.paid` webhook carries no signature, HMAC or shared
 * secret (their docs describe the event as "signed" but specify no
 * verification mechanism, and GET /v1/webhook returns no secret field). An
 * unauthenticated POST to our webhook URL would therefore be
 * indistinguishable from a genuine one, and crediting on its say-so would let
 * anyone who guesses the URL mint balance.
 *
 * So the webhook is treated strictly as a hint: it tells us *which* order to
 * look at, and nothing more. Every credit decision is made from a fresh
 * server-to-server read of the order, authenticated with our key. A forged
 * webhook then achieves nothing beyond a wasted API call.
 */

import { PAYMENT_METHOD_KEYS } from "@/config/payments";

const BASE_URL = "https://api.paymegate.com";
const TIMEOUT_MS = 15_000;

export class PayMeGateError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "PayMeGateError";
  }
}

function apiKey(): string {
  const key = process.env.PAYMEGATE_API_KEY;
  if (!key) {
    throw new PayMeGateError("PAYMEGATE_API_KEY is not configured");
  }
  return key;
}

export function isConfigured(): boolean {
  return Boolean(process.env.PAYMEGATE_API_KEY);
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "X-API-Key": apiKey(),
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
      cache: "no-store",
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      throw new PayMeGateError(
        `PayMeGate ${path} failed: ${describeError(body, res.statusText)}`,
        res.status,
        body
      );
    }

    return body as T;
  } catch (error) {
    if (error instanceof PayMeGateError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new PayMeGateError(`PayMeGate ${path} timed out`);
    }
    throw new PayMeGateError(
      `PayMeGate ${path} unreachable: ${error instanceof Error ? error.message : "unknown"}`
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Pull a human-readable message out of an error body.
 *
 * The API nests failures as `{error:{code,message,details}}`, so a naive
 * `body.error` renders "[object Object]" and hides the actual cause.
 */
function describeError(body: unknown, fallback: string): string {
  if (typeof body !== "object" || body === null) return fallback;

  const root = body as Record<string, unknown>;

  if (typeof root.message === "string") return root.message;

  const nested = root.error;
  if (typeof nested === "string") return nested;

  if (typeof nested === "object" && nested !== null) {
    const e = nested as Record<string, unknown>;
    const message = typeof e.message === "string" ? e.message : null;
    const code = typeof e.code === "string" ? e.code : null;

    // Validation failures carry the actionable part in details.issues; the
    // top-level message is only ever "Request validation failed", which is
    // not enough to debug from.
    const details = e.details as { issues?: unknown } | undefined;
    const issues = Array.isArray(details?.issues) ? details.issues : [];

    const described = issues
      .map((issue) => {
        if (typeof issue !== "object" || issue === null) return null;
        const i = issue as Record<string, unknown>;
        const path = typeof i.path === "string" && i.path ? `${i.path}: ` : "";
        return typeof i.message === "string" ? `${path}${i.message}` : null;
      })
      .filter((x): x is string => x !== null);

    if (described.length > 0) return described.join("; ");
    if (message) return code ? `${message} (${code})` : message;
    if (code) return code;
  }

  return fallback;
}

/** Gateway order lifecycle. */
export type OrderStatus = "UNPAID" | "PAID" | string;

export interface PayMeGateOrder {
  orderUUID: string;
  externalId?: string | null;
  status: OrderStatus;
  amount: string;
  currency: string;
  backUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  paymentMethodsKeys?: string[];
  checkoutUrl: string;
  transactionUUID?: string | null;
  transactionRef?: string | null;
  paidAt?: string | null;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface CreateOrderParams {
  /** Decimal amount; serialised as a string, which is what the API expects. */
  amount: number;
  currency: string;
  paymentMethodsKeys: string[];
  customer: { email: string; fullName: string };
  /** Our CardPayment id — the reconciliation handle on the gateway side. */
  externalId: string;
  /** Public HTTPS URL the user returns to after checkout. */
  backUrl: string;
  metadata?: Record<string, unknown>;
}

export async function createOrder(params: CreateOrderParams): Promise<PayMeGateOrder> {
  const keys = params.paymentMethodsKeys.filter((k) => PAYMENT_METHOD_KEYS.includes(k));

  if (keys.length === 0) {
    throw new PayMeGateError("No valid payment methods requested");
  }

  const res = await request<Envelope<PayMeGateOrder>>("/v1/orders", {
    method: "POST",
    body: JSON.stringify({
      // Amounts cross the wire as decimal strings; sending a float risks the
      // gateway receiving 49.99999999 for 50.00.
      amount: params.amount.toFixed(2),
      currency: params.currency,
      paymentMethodsKeys: keys,
      customer: params.customer,
      externalId: params.externalId,
      backUrl: params.backUrl,
      ...(params.metadata ? { metadata: params.metadata } : {}),
    }),
  });

  if (!res?.data?.checkoutUrl || !res.data.orderUUID) {
    throw new PayMeGateError("PayMeGate returned no checkout URL", undefined, res);
  }

  return res.data;
}

/**
 * Authoritative read of an order. This is the only source a credit decision
 * may be based on — see the security note at the top of this file.
 */
export async function getOrder(orderUUID: string): Promise<PayMeGateOrder> {
  const res = await request<Envelope<PayMeGateOrder>>(
    `/v1/orders/${encodeURIComponent(orderUUID)}`
  );

  if (!res?.data?.orderUUID) {
    throw new PayMeGateError("PayMeGate returned no order", undefined, res);
  }

  return res.data;
}

export interface GatewayPaymentMethod {
  key: string;
  displayName: string;
  minimumAmount: string;
  minimumCurrency: string;
  status: string;
}

export async function listPaymentMethods(): Promise<GatewayPaymentMethod[]> {
  const res = await request<Envelope<{ paymentMethods: GatewayPaymentMethod[] }>>(
    "/v1/payment-methods"
  );
  return res?.data?.paymentMethods ?? [];
}

/**
 * Register (or update) the webhook endpoint.
 *
 * Only `url` is accepted — passing `events` is rejected as an unrecognised
 * key; the gateway subscribes the endpoint to `order.paid` itself.
 *
 * The response carries `signingSecret` **once, on write only**. A subsequent
 * GET omits it, so capture it here or re-issue the endpoint to get a new one.
 */
export async function configureWebhook(
  url: string
): Promise<{ signingSecret?: string; [key: string]: unknown }> {
  const res = await request<Envelope<Record<string, unknown>>>("/v1/webhook", {
    method: "PUT",
    body: JSON.stringify({ url }),
  });
  return res.data as { signingSecret?: string };
}

export async function getWebhookConfig(): Promise<unknown> {
  return request("/v1/webhook");
}

/**
 * Compare a gateway amount against what we recorded.
 *
 * The API returns decimal strings; parsing both sides and comparing within a
 * cent avoids a float-equality mismatch rejecting a legitimate payment, while
 * still catching a tampered or genuinely different amount.
 */
export function amountMatches(expected: number, actual: string): boolean {
  const parsed = Number(actual);
  if (!Number.isFinite(parsed)) return false;
  return Math.abs(parsed - expected) < 0.01;
}
