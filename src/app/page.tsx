import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LandingPage } from "@/components/landing/landing-page";

export default async function Home() {
  let shouldRedirect = false;

  try {
    const session = await getSession();
    if (session?.user) {
      shouldRedirect = true;
    }
  } catch (error) {
    // If auth/DB fails, still show landing page instead of crashing
    console.error("Session check failed:", error);
  }

  if (shouldRedirect) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
