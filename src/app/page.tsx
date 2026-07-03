import { LandingPage } from "@/components/landing/landing-page";

// Statically generated + edge-cached. The authenticated "/" → "/dashboard"
// redirect is handled in middleware, so this page needs no per-request session
// lookup and can be served instantly from the CDN.
export const dynamic = "force-static";

export default function Home() {
  return <LandingPage />;
}
