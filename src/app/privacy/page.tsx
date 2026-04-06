import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface-0">
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link href="/" className="text-sm text-text-tertiary hover:text-text-primary transition-colors mb-8 inline-block">&larr; Back to Home</Link>

        <h1 className="text-3xl font-bold text-text-primary mb-2">Privacy Policy</h1>
        <p className="text-sm text-text-tertiary mb-10">Last updated: April 2026</p>

        <div className="prose prose-sm max-w-none text-text-secondary space-y-6 [&_h2]:text-text-primary [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:leading-relaxed [&_ul]:space-y-1 [&_li]:text-text-secondary">
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly: name, email address, password (hashed), wallet addresses, and transaction data. We also collect usage data including IP addresses, browser type, and interaction patterns.</p>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain the copy trading service</li>
            <li>To process deposits, withdrawals, and trade executions</li>
            <li>To verify your identity and prevent fraud</li>
            <li>To send transactional notifications (deposits, withdrawals, tier upgrades)</li>
            <li>To improve platform performance and user experience</li>
          </ul>

          <h2>3. Data Storage and Security</h2>
          <p>Your data is stored in encrypted databases hosted on secure cloud infrastructure. Passwords are hashed using bcrypt with 12 rounds. We use HTTPS for all communications and implement rate limiting to prevent abuse.</p>

          <h2>4. Third-Party Services</h2>
          <p>We use the following third-party services that may process your data:</p>
          <ul>
            <li>Supabase — database hosting and authentication infrastructure</li>
            <li>Vercel — application hosting and deployment</li>
            <li>Resend — transactional email delivery</li>
            <li>Sentry — error monitoring (anonymized)</li>
            <li>Payment providers — as selected during deposit (MoonPay, Thirdweb)</li>
          </ul>

          <h2>5. Data Sharing</h2>
          <p>We do not sell your personal data. We share data only when: required by law, necessary to provide the service (e.g., payment processing), or with your explicit consent.</p>

          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data (via Settings → Export My Data)</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your account and data</li>
            <li>Withdraw consent for optional data processing</li>
            <li>Request a portable copy of your data in JSON format</li>
          </ul>

          <h2>7. Data Retention</h2>
          <p>We retain your account data for as long as your account is active. Transaction records are retained for 7 years for regulatory compliance. You may request account deletion by contacting support.</p>

          <h2>8. Cookies</h2>
          <p>We use essential cookies for authentication and session management. We use localStorage to persist your theme preference. We do not use third-party tracking cookies.</p>

          <h2>9. Children&apos;s Privacy</h2>
          <p>The Platform is not intended for users under 18 years of age. We do not knowingly collect data from minors.</p>

          <h2>10. International Transfers</h2>
          <p>Your data may be processed in countries outside your jurisdiction. We ensure appropriate safeguards are in place for international data transfers.</p>

          <h2>11. Changes to This Policy</h2>
          <p>We may update this policy periodically. We will notify you of material changes via email or in-app notification.</p>

          <h2>12. Contact</h2>
          <p>For privacy-related inquiries, contact us through the Platform&apos;s support system or email privacy@copytradepro.app.</p>
        </div>
      </div>
    </div>
  );
}
