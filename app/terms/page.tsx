import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: November 16, 2025</p>

          <div className="prose prose-blue max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using WarmupPro ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                WarmupPro provides email warmup and outreach campaign management services. The Service allows users to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Connect email accounts for warmup campaigns</li>
                <li>Manage prospect lists and outreach campaigns</li>
                <li>Send automated email sequences</li>
                <li>Track email performance and analytics</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Obligations</h2>
              <p className="text-gray-700 mb-4">You agree to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Provide accurate and complete information when creating an account</li>
                <li>Maintain the security of your account credentials</li>
                <li>Comply with all applicable laws and regulations, including CAN-SPAM Act, GDPR, and other email marketing laws</li>
                <li>Only send emails to recipients who have given consent to receive communications</li>
                <li>Include accurate sender information in all emails</li>
                <li>Honor unsubscribe requests promptly</li>
                <li>Not use the Service for spam, phishing, or any malicious purposes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use Policy</h2>
              <p className="text-gray-700 mb-4">You may NOT use the Service to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Send unsolicited commercial emails (spam)</li>
                <li>Distribute malware, viruses, or harmful content</li>
                <li>Impersonate others or misrepresent your identity</li>
                <li>Violate any person's privacy or intellectual property rights</li>
                <li>Engage in any illegal activities</li>
                <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Violation of this policy may result in immediate termination of your account without refund.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Account Termination</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to suspend or terminate your account at any time for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Violation of these Terms of Service</li>
                <li>Fraudulent or illegal activity</li>
                <li>Non-payment of fees</li>
                <li>Abuse of the Service or other users</li>
              </ul>
              <p className="text-gray-700 mb-4">
                You may cancel your account at any time through the account settings page.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Payment and Billing</h2>
              <p className="text-gray-700 mb-4">
                Paid subscriptions are billed according to the plan you select. All fees are non-refundable except as required by law. We reserve the right to change pricing with 30 days notice to existing subscribers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WarmupPro shall not be liable for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Email deliverability issues caused by recipient servers or spam filters</li>
                <li>Loss of data or business opportunities</li>
                <li>Indirect, incidental, or consequential damages</li>
                <li>Service interruptions or downtime</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Our total liability shall not exceed the amount you paid for the Service in the past 12 months.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                All content, features, and functionality of the Service are owned by WarmupPro and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute any part of the Service without our written permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Data and Privacy</h2>
              <p className="text-gray-700 mb-4">
                Your use of the Service is also governed by our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>. By using the Service, you consent to our collection and use of your data as described in the Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these Terms of Service at any time. We will notify users of significant changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Governing Law</h2>
              <p className="text-gray-700 mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which WarmupPro operates, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <p className="text-gray-700">
                Email: support@warmuppro.com
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
