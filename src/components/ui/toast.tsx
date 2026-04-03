"use client";

import { Toaster as SonnerToaster } from "sonner";

export { toast } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      duration={4000}
      gap={8}
      toastOptions={{
        className:
          "!bg-surface-2 !border !border-border !text-text-primary !shadow-xl !rounded-xl",
        descriptionClassName: "!text-text-tertiary",
        style: {
          fontSize: "13px",
          fontFamily: "inherit",
        },
      }}
      theme="dark"
      richColors
      closeButton
    />
  );
}
