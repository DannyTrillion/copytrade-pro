"use client";

import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { TraderOnboardingModal } from "@/components/onboarding/trader-onboarding-modal";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { cn } from "@/lib/utils";
import { DashboardParticles } from "@/components/ui/dashboard-particles";
import { PageTransition } from "@/components/ui/page-transition";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const { sidebarOpen } = useDashboardStore();

  // Only show skeleton on initial load, not during client-side navigation
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DashboardSkeleton />
      </div>
    );
  }

  // If unauthenticated, middleware will redirect — show skeleton meanwhile
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DashboardSkeleton />
      </div>
    );
  }

  const isImpersonating = !!(session as { isImpersonating?: boolean }).isImpersonating;

  return (
    <div className="min-h-screen bg-surface-0 bg-mesh relative">
      <DashboardParticles />
      <ImpersonationBanner />
      <Sidebar userRole={session.user.role} userName={session.user.name || "User"} />
      <TopBar title="CopyTrade Pro" />
      <main
        className={cn(
          "min-h-screen transition-all duration-200",
          isImpersonating ? "pt-[calc(3.5rem+40px)]" : "pt-14",
          "pl-0 md:pl-[64px]",
          sidebarOpen && "md:pl-[240px]"
        )}
      >
        <div className="p-4 md:p-8 max-w-[1440px] mx-auto">
          <ErrorBoundary><PageTransition>{children}</PageTransition></ErrorBoundary>
        </div>
      </main>
      <InstallPrompt />
      <OnboardingModal />
      <TraderOnboardingModal />
    </div>
  );
}
