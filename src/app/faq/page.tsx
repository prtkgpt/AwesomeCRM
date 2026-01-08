import Link from 'next/link';
import { ChevronDown, Mail, MessageCircle } from 'lucide-react';

export default function FAQPage() {
  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          question: 'What is CleanDay CRM?',
          answer: 'CleanDay CRM is a comprehensive customer relationship management platform designed specifically for cleaning businesses. It helps you manage clients, schedule jobs, track invoices, manage your team, and grow your business all in one place.',
        },
        {
          question: 'How do I sign up for CleanDay CRM?',
          answer: 'Click the "Get Started" or "Sign Up" button on our homepage. You\'ll need to provide your business information, email, and create a password. We offer a free trial to get you started.',
        },
        {
          question: 'Is there a free trial?',
          answer: 'Yes! We offer a 14-day free trial with full access to all features. No credit card required to start your trial.',
        },
      ],
    },
    {
      category: 'Features & Functionality',
      questions: [
        {
          question: 'Can I manage multiple team members?',
          answer: 'Absolutely! CleanDay CRM includes comprehensive team management features. You can add cleaners, assign them to jobs, track their performance, manage schedules, and even handle payroll tracking.',
        },
        {
          question: 'Does CleanDay CRM support online payments?',
          answer: 'Yes, we integrate with Stripe for secure credit card payments. You can also track cash, check, Zelle, Venmo, and CashApp payments. The system supports copay management for insurance-based cleaning services.',
        },
        {
          question: 'Can I send estimates to clients?',
          answer: 'Yes! You can create professional estimates and send them directly to clients via email or SMS. Clients can view, accept, and book appointments directly from the estimate link.',
        },
        {
          question: 'How does the calendar work?',
          answer: 'Our calendar view shows all scheduled jobs with color-coding by team member. You can easily see unassigned jobs, drag-and-drop to reschedule, and filter by status, date range, and more.',
        },
        {
          question: 'What is the global search feature?',
          answer: 'Press Cmd+K (Mac) or Ctrl+K (Windows) to instantly search across all your clients, jobs, invoices, estimates, and team members. Results appear grouped by type for easy navigation.',
        },
      ],
    },
    {
      category: 'Billing & Pricing',
      questions: [
        {
          question: 'How much does CleanDay CRM cost?',
          answer: 'We offer flexible pricing starting at $20/month. Visit our pricing page for detailed plan information and features included in each tier.',
        },
        {
          question: 'Can I cancel anytime?',
          answer: 'Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees.',
        },
        {
          question: 'Do you offer discounts for annual billing?',
          answer: 'Yes! Save up to 20% when you choose annual billing instead of monthly. Contact our sales team for enterprise pricing options.',
        },
      ],
    },
    {
      category: 'Data & Security',
      questions: [
        {
          question: 'Is my data secure?',
          answer: 'Absolutely. We use industry-standard encryption for data transmission (SSL/TLS) and storage. Your data is backed up daily and stored in secure, redundant data centers.',
        },
        {
          question: 'Who can access my company data?',
          answer: 'Only users you invite to your company can access your data. You control user roles and permissions. We never share your data with third parties without your explicit consent.',
        },
        {
          question: 'Can I export my data?',
          answer: 'Yes, you can export your data at any time in CSV format. This includes clients, bookings, invoices, and other business records.',
        },
      ],
    },
    {
      category: 'Support',
      questions: [
        {
          question: 'What kind of support do you offer?',
          answer: 'We provide email support for all users, with priority support for premium plans. Our team typically responds within 24 hours on business days.',
        },
        {
          question: 'Do you offer training or onboarding?',
          answer: 'Yes! We provide video tutorials, documentation, and personalized onboarding sessions for new customers to help you get started quickly.',
        },
        {
          question: 'How do I report a bug or request a feature?',
          answer: 'Email us at support@cleandaycrm.com with your feedback. We actively incorporate user suggestions into our product roadmap.',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              CleanDay CRM
            </Link>
            <div className="flex gap-4">
              <Link
                href="/login"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Find answers to common questions about CleanDay CRM
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-8 bg-blue-600 rounded"></span>
                {category.category}
              </h2>
              <div className="space-y-4">
                {category.questions.map((faq, faqIndex) => (
                  <details
                    key={faqIndex}
                    className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <summary className="flex items-center justify-between cursor-pointer px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-8">
                        {faq.question}
                      </h3>
                      <ChevronDown className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform flex-shrink-0" />
                    </summary>
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Still have questions?
          </h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Can't find the answer you're looking for? Our support team is here to help.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="mailto:support@cleandaycrm.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Mail className="w-5 h-5" />
              Email Support
            </a>
            <Link
              href="/product-release"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors backdrop-blur"
            >
              <MessageCircle className="w-5 h-5" />
              View Updates
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20 py-8">
        <div className="max-w-5xl mx-auto px-6">
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
              href="/terms"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Terms of Service
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
