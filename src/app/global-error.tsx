"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#131722] text-white min-h-screen flex items-center justify-center">
        <div className="text-center px-6 max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-[#EF5350]/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-[#EF5350]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-white/50 mb-6">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-[#2962FF] hover:bg-[#1E50D2] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
