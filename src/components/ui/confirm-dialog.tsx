"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES = {
  danger: {
    icon: "bg-danger/10 text-danger",
    button: "bg-danger text-white hover:bg-danger/90",
  },
  warning: {
    icon: "bg-warning/10 text-warning",
    button: "bg-warning text-black hover:bg-warning/90",
  },
  default: {
    icon: "bg-brand/10 text-brand",
    button: "bg-brand text-white hover:bg-brand/90",
  },
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={onCancel}
          />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="glass-panel-elevated w-full max-w-sm p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <motion.div
                  className={`p-2.5 rounded-xl ${styles.icon}`}
                  initial={{ scale: 0.5, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.1 }}
                >
                  <AlertTriangle className="w-5 h-5" />
                </motion.div>
                <button onClick={onCancel} className="icon-btn">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
                <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{message}</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="btn-secondary flex-1 text-sm"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className={`flex-1 text-sm font-medium rounded-lg px-4 py-2.5 transition-all active:scale-[0.97] ${styles.button} disabled:opacity-50`}
                >
                  {loading ? "Processing..." : confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
