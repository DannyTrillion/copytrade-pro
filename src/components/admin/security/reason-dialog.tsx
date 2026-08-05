"use client";

/**
 * Mandatory-reason dialog.
 *
 * Every moderation action requires a written justification — the API rejects
 * anything shorter than MIN_REASON_LENGTH, so the control is enforced server
 * side and this dialog simply surfaces that requirement before the round trip.
 * Shared by every destructive action in the Security Center so the requirement
 * cannot be forgotten when a new action is added.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { MIN_REASON_LENGTH } from "@/config/security";

export interface ReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  title: string;
  description: string;
  confirmLabel: string;
  /** Renders the confirm button in the danger style. */
  destructive?: boolean;
  /** Extra controls rendered above the reason field (e.g. ban options). */
  children?: React.ReactNode;
}

export function ReasonDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  destructive = true,
  children,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset per-open so a previous reason is never silently reused on the next
  // action — reusing a justification across different targets is an audit bug.
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  const tooShort = reason.trim().length < MIN_REASON_LENGTH;

  const handleConfirm = async () => {
    if (tooShort || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <div className="flex gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
        </div>

        {children}

        <div>
          <label
            htmlFor="moderation-reason"
            className="block text-xs font-medium text-text-secondary mb-1.5"
          >
            Reason <span className="text-danger">*</span>
          </label>
          <textarea
            id="moderation-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Record why this action is being taken. This is permanent and attributed to your account."
            className="input-field w-full text-sm resize-none"
          />
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-2xs text-text-tertiary">
              Minimum {MIN_REASON_LENGTH} characters — stored in the audit trail
            </p>
            <p
              className={`text-2xs tabular-nums ${
                tooShort ? "text-text-tertiary" : "text-success"
              }`}
            >
              {reason.trim().length}
            </p>
          </div>
        </div>

        {error && (
          <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-secondary btn-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={tooShort || submitting}
            className={`${destructive ? "btn-danger" : "btn-primary"} btn-sm disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5`}
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
