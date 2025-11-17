import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: November 16, 2025</p>

          <div className="prose prose-blue max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                WarmupPro ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our email warmup and outreach service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.1 Account Information</h3>
              <p className="text-gray-700 mb-4">When you create an account, we collect:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Email address</li>
                <li>Name</li>
                <li>Password (encrypted)</li>
                <li>Company information (optional)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.2 Email Account Data</h3>
              <p className="text-gray-700 mb-4">When you connect email accounts, we collect:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Email account credentials (encrypted)</li>
                <li>SMTP/IMAP server settings</li>
                <li>Email sending and receiving data</li>
                <li>Email performance metrics</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.3 Campaign and Contact Data</h3>
              <p className="text-gray-700 mb-4">We collect information you provide about:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Prospect lists and contact information</li>
                <li>Email campaign content and settings</li>
                <li>Email templates and personalization data</li>
                <li>Campaign performance and analytics</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.4 Usage Data</h3>
              <p className="text-gray-700 mb-4">We automatically collect:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>IP address and device information</li>
                <li>Browser type and version</li>
                <li>Pages visited and features used</li>
                <li>Time and date of visits</li>
                <li>Error logs and diagnostic data</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.5 Payment Information</h3>
              <p className="text-gray-700 mb-4">
                Payment processing is handled by our payment processor (LemonSqueezy). We do not store your full credit card information. We receive transaction IDs and subscription status from the payment processor.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use your information to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Provide and maintain the Service</li>
                <li>Send emails on your behalf through connected accounts</li>
                <li>Process your transactions and manage subscriptions</li>
                <li>Improve and optimize the Service</li>
                <li>Provide customer support</li>
                <li>Send service-related notifications</li>
                <li>Detect and prevent fraud or abuse</li>
                <li>Comply with legal obligations</li>
                <li>Analyze usage patterns and generate analytics</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-4">We may share your information with:</p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">4.1 Service Providers</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Cloud hosting providers (Vercel, Supabase)</li>
                <li>Payment processors (LemonSqueezy)</li>
                <li>Email service providers</li>
                <li>Analytics and monitoring services (Sentry)</li>
                <li>AI services (Google Gemini) for email personalization</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">4.2 Legal Requirements</h3>
              <p className="text-gray-700 mb-4">
                We may disclose your information if required by law, court order, or government request, or to protect our rights, property, or safety.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">4.3 Business Transfers</h3>
              <p className="text-gray-700 mb-4">
                If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.
              </p>

              <p className="text-gray-700 mb-4 font-semibold">
                We do NOT sell your personal information to third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 mb-4">We implement security measures to protect your data:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Encryption of data in transit (HTTPS/TLS)</li>
                <li>Encryption of sensitive data at rest</li>
                <li>Secure password hashing</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication</li>
                <li>Monitoring for suspicious activity</li>
              </ul>
              <p className="text-gray-700 mb-4">
                However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your information for as long as your account is active or as needed to provide services. When you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal or regulatory purposes.
              </p>
              <p className="text-gray-700 mb-4">
                Email logs and analytics data may be retained for up to 2 years for service improvement and compliance purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights (GDPR)</h2>
              <p className="text-gray-700 mb-4">If you are in the European Economic Area, you have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
                <li><strong>Restriction:</strong> Limit how we use your data</li>
                <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
                <li><strong>Objection:</strong> Object to processing of your data</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
              </ul>
              <p className="text-gray-700 mb-4">
                To exercise these rights, contact us at privacy@warmuppro.com
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cookies and Tracking</h2>
              <p className="text-gray-700 mb-4">We use cookies and similar technologies to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Maintain your session and authentication</li>
                <li>Remember your preferences</li>
                <li>Analyze usage patterns</li>
                <li>Improve user experience</li>
              </ul>
              <p className="text-gray-700 mb-4">
                You can control cookies through your browser settings. Disabling cookies may affect functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Third-Party Links</h2>
              <p className="text-gray-700 mb-4">
                Our Service may contain links to third-party websites. We are not responsible for the privacy practices of these sites. We encourage you to review their privacy policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy and applicable laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to Privacy Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the Service. The "Last updated" date at the top indicates when the policy was last revised.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Email:</strong> privacy@warmuppro.com
              </p>
              <p className="text-gray-700">
                <strong>Support:</strong> support@warmuppro.com
              </p>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
