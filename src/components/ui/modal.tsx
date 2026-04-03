"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className={cn(
              "relative glass-panel-elevated p-5 md:p-6 z-10 w-full",
              // Mobile: bottom sheet style
              "rounded-t-xl md:rounded-xl",
              "max-h-[85vh] overflow-y-auto",
              size === "sm" && "md:max-w-sm",
              size === "md" && "md:max-w-lg",
              size === "lg" && "md:max-w-2xl"
            )}
          >
            {/* Mobile drag handle */}
            <div className="flex justify-center mb-3 md:hidden">
              <div className="w-10 h-1 rounded-full bg-surface-5" />
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
              <button
                onClick={onClose}
                className="icon-btn"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
