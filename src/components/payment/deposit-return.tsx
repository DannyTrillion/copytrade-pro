"use client";

/**
 * Post-checkout return handler.
 *
 * The gateway sends the user back to `?payment=<id>`. This polls the status
 * endpoint, which re-verifies the order server-side — so the balance lands
 * while the user is still looking at the screen even if the webhook is slow or
 * never arrives.
 *
 * Polling stops at a terminal status or after a bounded window; a payment that
 * has not cleared by then is left to the reconciliation sweep rather than
 * spinning forever in front of the user.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, Loader2, X, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const POLL_MS = 3_000;
const MAX_POLLS = 20; // ~1 minute

interface StatusResponse {
  status: string;
  amount: number;
  currency: string;
  method: string | null;
  reference: string | null;
  justCredited?: boolean;
}

const TERMINAL = ["CONFIRMED", "REJECTED", "FAILED", "EXPIRED"];

export function DepositReturn({
  paymentId,
  onClose,
  onCredited,
}: {
  paymentId: string;
  onClose: () => void;
  /** Fired once when the balance actually moves, so the page can refresh. */
  onCredited?: () => void;
}) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const polls = useRef(0);
  const credited = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/payments/paymegate/status?id=${encodeURIComponent(paymentId)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not load payment status");
        return true;
      }

      setStatus(data);

      if (data.status === "CONFIRMED" && !credited.current) {
        credited.current = true;
        onCredited?.();
      }

      return TERMINAL.includes(data.status);
    } catch {
      setError("Network error checking payment status");
      return false;
    }
  }, [paymentId, onCredited]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const run = async () => {
      const done = await poll();
      if (!active || done) return;

      polls.current += 1;
      if (polls.current >= MAX_POLLS) {
        setExhausted(true);
        return;
      }

      timer = setTimeout(run, POLL_MS);
    };

    run();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [poll]);

  const state = status?.status;
  const confirmed = state === "CONFIRMED";
  const failed = state === "REJECTED" || state === "FAILED" || state === "EXPIRED";
  const pending = !confirmed && !failed;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`glass-panel p-4 mb-4 border ${
          confirmed
            ? "border-success/30"
            : failed
              ? "border-danger/30"
              : "border-warning/30"
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="shrink-0 mt-0.5">
            {confirmed ? (
              <CheckCircle2 className="w-5 h-5 text-success" />
            ) : failed ? (
              <XCircle className="w-5 h-5 text-danger" />
            ) : exhausted ? (
              <Clock className="w-5 h-5 text-warning" />
            ) : (
              <Loader2 className="w-5 h-5 text-warning animate-spin" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            {confirmed && status && (
              <>
                <p className="text-sm font-semibold text-text-primary">
                  Deposit confirmed — {formatCurrency(status.amount)} added
                </p>
                <p className="text-2xs text-text-tertiary mt-0.5">
                  Your balance has been updated
                  {status.reference ? ` · ref ${status.reference}` : ""}.
                </p>
              </>
            )}

            {failed && (
              <>
                <p className="text-sm font-semibold text-text-primary">
                  Payment not completed
                </p>
                <p className="text-2xs text-text-tertiary mt-0.5">
                  No funds were taken. You can start a new deposit at any time.
                </p>
              </>
            )}

            {pending && !exhausted && (
              <>
                <p className="text-sm font-semibold text-text-primary">
                  Confirming your payment…
                </p>
                <p className="text-2xs text-text-tertiary mt-0.5">
                  This usually takes a few seconds. You can safely leave this page.
                </p>
              </>
            )}

            {pending && exhausted && (
              <>
                <p className="text-sm font-semibold text-text-primary">
                  Still processing
                </p>
                <p className="text-2xs text-text-tertiary mt-0.5">
                  Your payment is taking longer than usual to clear. It will be
                  credited automatically once confirmed — no action needed.
                </p>
              </>
            )}

            {error && <p className="text-2xs text-danger mt-1">{error}</p>}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss"
            className="shrink-0 p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
