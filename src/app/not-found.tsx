import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* Illustration */}
        <div className="relative mx-auto w-48 h-36 mb-8">
          <svg viewBox="0 0 200 140" fill="none" className="w-full h-full text-text-primary">
            {/* Large 404 */}
            <text x="100" y="80" textAnchor="middle" fill="currentColor" fillOpacity="0.04" fontSize="72" fontWeight="800" fontFamily="system-ui">404</text>
            {/* Broken chart line */}
            <path d="M30 100 L60 70 L80 85 L95 50 L100 50" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M110 80 L130 60 L150 75 L170 40" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="4 6" />
            {/* Gap indicator */}
            <circle cx="100" cy="50" r="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
            <circle cx="110" cy="80" r="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-2">Page not found</h1>
        <p className="text-sm text-text-tertiary mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-6 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="px-6 py-2.5 bg-surface-2 hover:bg-surface-3 text-text-secondary text-sm font-medium rounded-xl transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
