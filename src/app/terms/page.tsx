import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface-0">
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link href="/" className="text-sm text-text-tertiary hover:text-text-primary transition-colors mb-8 inline-block">&larr; Back to Home</Link>

        <h1 className="text-3xl font-bold text-text-primary mb-2">Terms of Service</h1>
        <p className="text-sm text-text-tertiary mb-10">Last updated: April 2026</p>

        <div className="prose prose-sm max-w-none text-text-secondary space-y-6 [&_h2]:text-text-primary [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:leading-relaxed [&_ul]:space-y-1 [&_li]:text-text-secondary">
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using CopyTrade Pro (&ldquo;the Platform&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>

          <h2>2. Description of Service</h2>
          <p>CopyTrade Pro provides a copy trading platform that allows users to follow and automatically replicate the trading signals of master traders on supported markets including Polymarket. The Platform facilitates signal distribution, not financial advice.</p>

          <h2>3. Eligibility</h2>
          <p>You must be at least 18 years old and legally capable of entering into binding agreements in your jurisdiction. You are responsible for ensuring your use of the Platform complies with all applicable laws.</p>

          <h2>4. Account Registration</h2>
          <p>You agree to provide accurate information during registration and to keep your account credentials secure. You are responsible for all activity under your account. Notify us immediately of any unauthorized access.</p>

          <h2>5. Copy Trading Risks</h2>
          <ul>
            <li>Past performance of any trader does not guarantee future results.</li>
            <li>You may lose some or all of your deposited funds through copy trading.</li>
            <li>The Platform does not provide investment advice or recommendations.</li>
            <li>You are solely responsible for your trading decisions and risk management.</li>
          </ul>

          <h2>6. Deposits and Withdrawals</h2>
          <p>Deposits are processed after admin review. Withdrawal requests are subject to verification and may take up to 48 hours. The Platform reserves the right to request additional verification for large transactions.</p>

          <h2>7. Fees and Commissions</h2>
          <p>The Platform charges commissions on profitable copy trades as specified by your account tier. Commission rates and tier thresholds are published on the Platform and may be updated with notice.</p>

          <h2>8. Prohibited Activities</h2>
          <p>You may not: manipulate trading signals, create multiple accounts, engage in money laundering, attempt to exploit platform vulnerabilities, or use the Platform for any illegal purpose.</p>

          <h2>9. Intellectual Property</h2>
          <p>All content, design, and technology on the Platform are owned by CopyTrade Pro. You may not copy, modify, or distribute any part of the Platform without written permission.</p>

          <h2>10. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, CopyTrade Pro shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform, including trading losses.</p>

          <h2>11. Termination</h2>
          <p>We may suspend or terminate your account at our discretion for violations of these terms. You may close your account at any time by contacting support, subject to pending transaction settlement.</p>

          <h2>12. Changes to Terms</h2>
          <p>We may update these terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated terms.</p>

          <h2>13. Contact</h2>
          <p>For questions about these terms, contact us through the Platform&apos;s support system or email support@copytradepro.app.</p>
        </div>
      </div>
    </div>
  );
}
