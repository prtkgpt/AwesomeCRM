import Link from 'next/link';

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Last updated: January 2026
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                1. Agreement to Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                By accessing or using CleanDay CRM ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, you may not access the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                2. Use License
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Permission is granted to temporarily use CleanDay CRM for business operations related to managing cleaning services. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4 mb-4">
                <li>Modify or copy the software</li>
                <li>Use the software for any commercial purpose outside your organization</li>
                <li>Attempt to decompile or reverse engineer the software</li>
                <li>Remove any copyright or proprietary notations</li>
                <li>Transfer the software to another person or entity</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                3. Account Registration
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                You are responsible for safeguarding the password and for all activities under your account. You agree not to disclose your password to any third party and to notify us immediately upon becoming aware of any breach of security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                4. Subscription and Billing
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Some parts of the Service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis (monthly or annually). Billing cycles are set at the beginning of your subscription.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                A valid payment method is required to process the payment for your subscription. You shall provide accurate and complete billing information including name, address, and payment method information.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Subscriptions may be canceled at any time through your account settings. Upon cancellation, you will continue to have access until the end of your current billing period.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                5. Free Trial
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                CleanDay CRM may offer a Free Trial for new users. During the Free Trial period, you have access to all features of the Service.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                At the end of the Free Trial period, you will be charged the applicable subscription fee unless you cancel your subscription before the trial ends.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                6. Refunds
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Except when required by law, paid subscription fees are non-refundable. If you cancel your subscription, you will continue to have access to the Service until the end of your current billing period.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                7. Content and Data
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                You retain all rights to the data you enter into CleanDay CRM. We claim no intellectual property rights over the material you provide to the Service.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                By uploading content, you grant us permission to use it solely for the purpose of providing and improving the Service. We will not share your data with third parties without your explicit consent, except as required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                8. Prohibited Uses
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                You may use the Service only for lawful purposes and in accordance with these Terms. You agree not to use the Service:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4 mb-4">
                <li>In any way that violates any applicable law or regulation</li>
                <li>To transmit any unsolicited or unauthorized advertising or promotional material</li>
                <li>To impersonate or attempt to impersonate the Company, another user, or any other person or entity</li>
                <li>To engage in any conduct that restricts or inhibits anyone's use of the Service</li>
                <li>To introduce any viruses, trojan horses, worms, or other malicious code</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                9. Service Availability
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We strive to maintain 99.9% uptime but cannot guarantee uninterrupted access to the Service. We reserve the right to modify or discontinue the Service with or without notice.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We will not be liable if for any reason all or any part of the Service is unavailable at any time or for any period.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                10. Limitation of Liability
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                In no event shall CleanDay CRM, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                11. Disclaimer
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                12. Termination
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service or contact us to delete your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                13. Changes to Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                14. Contact Us
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                If you have any questions about these Terms, please contact us:
              </p>
              <ul className="list-none text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                <li>• Email: <a href="mailto:support@cleandaycrm.com" className="text-blue-600 dark:text-blue-400 hover:underline">support@cleandaycrm.com</a></li>
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
              href="/privacy"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Privacy Policy
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
