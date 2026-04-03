"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Error Boundary (class component — required by React)                      */
/* -------------------------------------------------------------------------- */

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-[320px] p-6">
          <div className="glass-panel p-8 max-w-md w-full text-center space-y-5">
            <div className="mx-auto w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-danger" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-text-primary">
                Something went wrong
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                An unexpected error occurred. Try again or contact support if the
                problem persists.
              </p>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="text-xs text-danger/80 bg-surface-2 rounded-lg p-3 text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}

            <button
              onClick={this.handleReset}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium",
                "bg-brand text-white",
                "hover:bg-brand/90 active:scale-[0.97]",
                "transition-all duration-200"
              )}
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/* -------------------------------------------------------------------------- */
/*  PageError — functional component for API / page-level error states        */
/* -------------------------------------------------------------------------- */

interface PageErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function PageError({
  message = "Failed to load data. Please try again.",
  onRetry,
  className,
}: PageErrorProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center min-h-[240px] p-6",
        className
      )}
    >
      <div className="glass-panel p-8 max-w-sm w-full text-center space-y-4">
        <div className="mx-auto w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-danger" />
        </div>

        <p className="text-sm text-text-secondary leading-relaxed">{message}</p>

        {onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-surface-3 text-text-primary",
              "hover:bg-surface-4 active:scale-[0.97]",
              "transition-all duration-200"
            )}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
