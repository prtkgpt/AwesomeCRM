import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              CleanDay CRM
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Last updated: January 2026
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                1. Introduction
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                CleanDay CRM ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our customer relationship management platform.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                2. Information We Collect
              </h2>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Personal Information
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We collect personal information that you voluntarily provide to us when you:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4 mb-4">
                <li>Register for an account</li>
                <li>Use the Service</li>
                <li>Contact us for support</li>
                <li>Subscribe to our newsletter</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                This information may include:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4 mb-4">
                <li>Name and contact information (email, phone number, address)</li>
                <li>Company name and business information</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Customer data (names, addresses, service history)</li>
                <li>Team member information</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">
                Automatically Collected Information
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                When you use our Service, we may automatically collect certain information, including:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4 mb-4">
                <li>Log data (IP address, browser type, pages visited)</li>
                <li>Device information</li>
                <li>Usage data and analytics</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4 mb-4">
                <li>Provide, operate, and maintain our Service</li>
                <li>Process your transactions and manage your account</li>
                <li>Send you updates, notifications, and administrative messages</li>
                <li>Respond to your comments, questions, and customer service requests</li>
                <li>Improve and personalize your experience</li>
                <li>Analyze usage patterns and optimize our Service</li>
                <li>Detect, prevent, and address technical issues or fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                4. How We Share Your Information
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We do not sell or rent your personal information to third parties. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4 mb-4">
                <li><strong>Service Providers:</strong> We may share your information with third-party service providers who perform services on our behalf (e.g., Stripe for payment processing, Twilio for SMS, Resend for email)</li>
                <li><strong>Legal Requirements:</strong> We may disclose your information if required by law or in response to valid legal requests</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred</li>
                <li><strong>With Your Consent:</strong> We may share information for any other purpose with your consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                5. Data Security
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information, including:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4 mb-4">
                <li>Encryption of data in transit (SSL/TLS)</li>
                <li>Encryption of sensitive data at rest</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication</li>
                <li>Daily backups stored in secure, redundant data centers</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                6. Data Retention
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We retain your personal information for as long as necessary to provide you with our Service and fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                When you cancel your account, we will delete or anonymize your personal information within 90 days, except where we are required to retain it for legal, tax, or regulatory purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                7. Your Privacy Rights
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Depending on your location, you may have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4 mb-4">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Data Portability:</strong> Request a copy of your data in a machine-readable format</li>
                <li><strong>Opt-Out:</strong> Opt-out of marketing communications at any time</li>
                <li><strong>Restriction:</strong> Request restriction of processing your personal information</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                To exercise these rights, please contact us at <a href="mailto:privacy@cleandaycrm.com" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@cleandaycrm.com</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                8. Cookies and Tracking Technologies
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We use cookies and similar tracking technologies to track activity on our Service and hold certain information. Cookies are files with a small amount of data that are sent to your browser from a website and stored on your device.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                9. Third-Party Services
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Our Service may integrate with third-party services:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4 mb-4">
                <li><strong>Stripe:</strong> Payment processing (subject to Stripe's Privacy Policy)</li>
                <li><strong>Twilio:</strong> SMS messaging (subject to Twilio's Privacy Policy)</li>
                <li><strong>Resend:</strong> Email delivery (subject to Resend's Privacy Policy)</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                These third-party services have their own privacy policies. We recommend reviewing their policies before using our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                10. Children's Privacy
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Our Service is not intended for children under the age of 13. We do not knowingly collect personally identifiable information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                11. International Data Transfers
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Your information may be transferred to and maintained on servers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                By using our Service, you consent to the transfer of your information to the United States and other countries where we operate.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                12. Changes to This Privacy Policy
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                13. Contact Us
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <ul className="list-none text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                <li>• Email: <a href="mailto:privacy@cleandaycrm.com" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@cleandaycrm.com</a></li>
                <li>• Support: <a href="mailto:support@cleandaycrm.com" className="text-blue-600 dark:text-blue-400 hover:underline">support@cleandaycrm.com</a></li>
                <li>• Website: <a href="https://www.cleandaycrm.com" className="text-blue-600 dark:text-blue-400 hover:underline">www.cleandaycrm.com</a></li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
            <a
              href="mailto:support@cleandaycrm.com"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Support
            </a>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link
              href="/product-release"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              New Updates
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link
              href="/faq"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              FAQ
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link
              href="/terms"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <a
              href="https://www.prateekgupta.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              © 2026 CleanDay CRM
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
