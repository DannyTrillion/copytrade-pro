import Link from "next/link";

export const metadata = {
  title: "Access Denied",
};

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* Shield illustration */}
        <div className="relative mx-auto w-48 h-36 mb-8">
          <svg viewBox="0 0 200 140" fill="none" className="w-full h-full text-text-primary">
            <text x="100" y="80" textAnchor="middle" fill="currentColor" fillOpacity="0.04" fontSize="72" fontWeight="800" fontFamily="system-ui">403</text>
            {/* Shield */}
            <path d="M100 25 L130 38 L130 70 C130 90 115 105 100 112 C85 105 70 90 70 70 L70 38 Z" fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1.5" />
            {/* Lock icon inside shield */}
            <rect x="91" y="60" width="18" height="14" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
            <path d="M95 60 L95 54 C95 50 97 48 100 48 C103 48 105 50 105 54 L105 60" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="100" cy="67" r="2" fill="currentColor" fillOpacity="0.15" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h1>
        <p className="text-sm text-text-tertiary mb-8 leading-relaxed">
          You don&apos;t have permission to view this page. If you believe this is an error, please contact support.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-6 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/dashboard/support"
            className="px-6 py-2.5 bg-surface-2 hover:bg-surface-3 text-text-secondary text-sm font-medium rounded-xl transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
