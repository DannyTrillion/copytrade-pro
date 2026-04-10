"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { trackPageView } from "@/lib/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

// Initialize PostHog once
let posthogInitialized = false;
function initPostHog() {
  if (posthogInitialized || !POSTHOG_KEY || typeof window === "undefined") return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // We track manually
    capture_pageleave: true,
    persistence: "localStorage",
    autocapture: true,
    disable_session_recording: false,
  });
  posthogInitialized = true;
}

export function AnalyticsProvider() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Initialize PostHog
  useEffect(() => {
    initPostHog();
  }, []);

  // Identify user when logged in
  useEffect(() => {
    if (!POSTHOG_KEY || !session?.user) return;
    posthog.identify(session.user.id, {
      email: session.user.email,
      name: session.user.name,
      role: (session.user as { role?: string }).role,
    });
  }, [session]);

  // Track page views
  useEffect(() => {
    if (pathname) {
      trackPageView(pathname);
      if (POSTHOG_KEY) {
        posthog.capture("$pageview", { $current_url: window.location.href });
      }
    }
  }, [pathname]);

  // Reset on logout
  useEffect(() => {
    if (!session && POSTHOG_KEY && posthogInitialized) {
      posthog.reset();
    }
  }, [session]);

  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
            send_page_view: false,
          });
        `}
      </Script>
    </>
  );
}

// Export posthog instance for custom event tracking
export { posthog };
