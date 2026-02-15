import Link from 'next/link';
import {
  Calendar,
  DollarSign,
  Clock,
  Shield,
  Zap,
  Star,
  CheckCircle,
  XCircle,
  Smartphone,
  ArrowRight,
  AlertTriangle,
  Heart,
  FileText,
  Settings,
  Sparkles,
  ChevronRight,
  Timer,
  Banknote,
  HeartHandshake,
  Rocket
} from 'lucide-react';
import { SwitchPageCTA } from '@/components/marketing';

export const metadata = {
  title: 'Switch to CleanDay CRM - Save 90% on Your Cleaning Business Software',
  description: 'Tired of overpaying for BookingKoala, ZenMaid, or Launch27? Switch to CleanDay CRM and save up to $2,000/year while getting more features.',
};

const competitors = [
  { name: 'BookingKoala', price: 197, logo: '🐨' },
  { name: 'ZenMaid', price: 297, logo: '🧹' },
  { name: 'Launch27', price: 149, logo: '🚀' },
  { name: 'Jobber', price: 499, logo: '💼' },
  { name: 'Housecall Pro', price: 199, logo: '🏠' },
];

const painPoints = [
  {
    icon: DollarSign,
    title: 'Paying Too Much',
    description: 'Why pay $200-500/month when you can get the same (or better) features for $20/month?',
    color: 'red',
  },
  {
    icon: AlertTriangle,
    title: 'Unreliable Service',
    description: 'Tired of downtime during peak booking hours? We\'ve all seen the BookingKoala meltdowns.',
    color: 'orange',
  },
  {
    icon: Settings,
    title: 'Overly Complex',
    description: 'Spending hours learning complicated software instead of growing your business?',
    color: 'yellow',
  },
  {
    icon: HeartHandshake,
    title: 'Poor Support',
    description: 'Waiting days for support responses while your business suffers? We respond in hours, not days.',
    color: 'purple',
  },
];

const features = [
  { name: 'Online Booking', cleanday: true, bookingkoala: true, zenmaid: true, launch27: true },
  { name: 'Recurring Appointments', cleanday: true, bookingkoala: true, zenmaid: true, launch27: true },
  { name: 'SMS Reminders', cleanday: true, bookingkoala: true, zenmaid: true, launch27: true },
  { name: 'Payment Processing', cleanday: true, bookingkoala: true, zenmaid: true, launch27: true },
  { name: 'Team Management', cleanday: true, bookingkoala: true, zenmaid: true, launch27: true },
  { name: 'Customer Portal', cleanday: true, bookingkoala: true, zenmaid: true, launch27: true },
  { name: 'Insurance Billing', cleanday: true, bookingkoala: false, zenmaid: false, launch27: false },
  { name: 'Tip Collection', cleanday: true, bookingkoala: false, zenmaid: false, launch27: false },
  { name: 'Native Mobile Apps', cleanday: true, bookingkoala: false, zenmaid: false, launch27: false },
  { name: 'Real-time GPS Tracking', cleanday: true, bookingkoala: false, zenmaid: true, launch27: false },
  { name: 'Automated Review Requests', cleanday: true, bookingkoala: true, zenmaid: true, launch27: false },
  { name: 'Revenue Analytics', cleanday: true, bookingkoala: true, zenmaid: true, launch27: true },
  { name: 'Custom Job Checklists', cleanday: true, bookingkoala: true, zenmaid: true, launch27: true },
  { name: 'Referral Program Built-in', cleanday: true, bookingkoala: false, zenmaid: false, launch27: false },
  { name: 'Price per Month', cleanday: '$20', bookingkoala: '$197', zenmaid: '$297', launch27: '$149' },
];

const migrationSteps = [
  {
    step: 1,
    title: 'Export Your Data',
    description: 'Download your customer list, appointments, and team info from your current software.',
    icon: FileText,
  },
  {
    step: 2,
    title: 'Sign Up for CleanDay',
    description: 'Create your account in 2 minutes. No credit card required for your 14-day trial.',
    icon: Rocket,
  },
  {
    step: 3,
    title: 'We Import Everything',
    description: 'Send us your export and we\'ll import all your data for FREE. Usually done same day.',
    icon: Sparkles,
  },
  {
    step: 4,
    title: 'Start Saving Money',
    description: 'Cancel your old subscription and enjoy saving $100-400/month immediately.',
    icon: Banknote,
  },
];

const testimonials = [
  {
    quote: "I was paying BookingKoala $197/month for 2 years. That's over $4,700 I could have saved! CleanDay does everything I need and more.",
    author: 'Maria S.',
    company: 'Sparkle Clean Atlanta',
    previousSoftware: 'BookingKoala',
    savings: '$177/month',
  },
  {
    quote: "ZenMaid kept raising prices every year. When I found CleanDay at $20/month with the same features, I switched immediately. Best decision ever.",
    author: 'James K.',
    company: 'Crystal Clear Cleaning',
    previousSoftware: 'ZenMaid',
    savings: '$277/month',
  },
  {
    quote: "Launch27 was fine but outdated. CleanDay feels modern, works on my phone, and costs a fraction. My team loves it.",
    author: 'Sarah M.',
    company: 'Home Shine Services',
    previousSoftware: 'Launch27',
    savings: '$129/month',
  },
];

const savingsCalculator = [
  { from: 'BookingKoala', monthly: 177, yearly: 2124 },
  { from: 'ZenMaid', monthly: 277, yearly: 3324 },
  { from: 'Launch27', monthly: 129, yearly: 1548 },
  { from: 'Jobber', monthly: 479, yearly: 5748 },
  { from: 'Housecall Pro', monthly: 179, yearly: 2148 },
];

export default function SwitchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">CleanDay CRM</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/compare" className="text-gray-600 hover:text-blue-600 font-medium hidden md:block">
              Compare All Features
            </Link>
            <Link
              href="/login"
              className="text-gray-600 hover:text-blue-600 font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20 text-center">
        <div className="max-w-5xl mx-auto">
          {/* Competitor Logos */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {competitors.map((comp) => (
              <div key={comp.name} className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-gray-500 line-through">
                <span>{comp.logo}</span>
                <span className="text-sm font-medium">{comp.name}</span>
              </div>
            ))}
          </div>

          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-2 rounded-full mb-6 animate-pulse">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Stop Overpaying for Cleaning Software!</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
            Switch to CleanDay &<br />Save Up to $5,000/Year
          </h1>

          <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
            Why pay <span className="text-red-600 font-bold line-through">$197-$499/month</span> for BookingKoala, ZenMaid, or Launch27?
            <br />
            Get <span className="text-green-600 font-bold">all the same features for just $20/month</span>.
          </p>

          {/* Savings Highlight */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-2xl p-6 md:p-8 max-w-2xl mx-auto mb-8">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Other Software</p>
                <p className="text-4xl font-bold text-red-600 line-through">$197+/mo</p>
              </div>
              <ArrowRight className="h-8 w-8 text-green-600 hidden md:block" />
              <ChevronRight className="h-8 w-8 text-green-600 md:hidden rotate-90" />
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">CleanDay CRM</p>
                <p className="text-4xl font-bold text-green-600">$20/mo</p>
              </div>
              <div className="text-center bg-green-600 text-white px-4 py-3 rounded-xl">
                <p className="text-sm font-medium">You Save</p>
                <p className="text-2xl font-bold">90%</p>
              </div>
            </div>
          </div>

          <SwitchPageCTA variant="hero" />

          <p className="mt-6 text-gray-500 text-sm">
            No credit card required • Cancel anytime • Free data migration
          </p>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Sound Familiar? 😩
            </h2>
            <p className="text-xl text-gray-300">
              These are the reasons cleaning business owners are switching to CleanDay
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {painPoints.map((point) => (
              <div
                key={point.title}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  point.color === 'red' ? 'bg-red-500/20 text-red-400' :
                  point.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                  point.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  <point.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{point.title}</h3>
                <p className="text-gray-300">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Feature-by-Feature Comparison
            </h2>
            <p className="text-xl text-gray-600">
              Same features (plus extras), fraction of the price
            </p>
          </div>

          <div className="max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-4 font-bold text-gray-900">Feature</th>
                  <th className="p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl">✨</span>
                      <span className="font-bold text-green-600">CleanDay</span>
                      <span className="text-sm text-gray-500">$20/mo</span>
                    </div>
                  </th>
                  <th className="p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl">🐨</span>
                      <span className="font-bold text-gray-600">BookingKoala</span>
                      <span className="text-sm text-gray-500">$197/mo</span>
                    </div>
                  </th>
                  <th className="p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl">🧹</span>
                      <span className="font-bold text-gray-600">ZenMaid</span>
                      <span className="text-sm text-gray-500">$297/mo</span>
                    </div>
                  </th>
                  <th className="p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl">🚀</span>
                      <span className="font-bold text-gray-600">Launch27</span>
                      <span className="text-sm text-gray-500">$149/mo</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr key={feature.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-4 font-medium text-gray-900">{feature.name}</td>
                    <td className="p-4 text-center">
                      {typeof feature.cleanday === 'boolean' ? (
                        feature.cleanday ? (
                          <CheckCircle className="h-6 w-6 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-400 mx-auto" />
                        )
                      ) : (
                        <span className="font-bold text-green-600">{feature.cleanday}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {typeof feature.bookingkoala === 'boolean' ? (
                        feature.bookingkoala ? (
                          <CheckCircle className="h-6 w-6 text-gray-400 mx-auto" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-400 mx-auto" />
                        )
                      ) : (
                        <span className="font-bold text-red-600">{feature.bookingkoala}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {typeof feature.zenmaid === 'boolean' ? (
                        feature.zenmaid ? (
                          <CheckCircle className="h-6 w-6 text-gray-400 mx-auto" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-400 mx-auto" />
                        )
                      ) : (
                        <span className="font-bold text-red-600">{feature.zenmaid}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {typeof feature.launch27 === 'boolean' ? (
                        feature.launch27 ? (
                          <CheckCircle className="h-6 w-6 text-gray-400 mx-auto" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-400 mx-auto" />
                        )
                      ) : (
                        <span className="font-bold text-red-600">{feature.launch27}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center mt-8">
            <p className="text-lg text-gray-600 mb-4">
              <strong>CleanDay has exclusive features</strong> that competitors don't offer at any price!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Insurance Billing</span>
              </div>
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                <Banknote className="h-5 w-5" />
                <span className="font-medium">Tip Collection</span>
              </div>
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                <Smartphone className="h-5 w-5" />
                <span className="font-medium">Native Mobile Apps</span>
              </div>
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                <Heart className="h-5 w-5" />
                <span className="font-medium">Referral Program</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Savings Calculator Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Calculate Your Savings 💰
            </h2>
            <p className="text-xl text-blue-100">
              See how much you'll save when you switch to CleanDay
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {savingsCalculator.map((calc) => (
              <div key={calc.from} className="bg-white rounded-xl p-6 text-center hover:scale-105 transition-transform">
                <p className="text-gray-600 mb-2">Switching from</p>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{calc.from}</h3>
                <div className="border-t border-gray-200 pt-4">
                  <div className="mb-3">
                    <p className="text-sm text-gray-500">Monthly Savings</p>
                    <p className="text-3xl font-bold text-green-600">${calc.monthly}</p>
                  </div>
                  <div className="bg-green-100 rounded-lg p-3">
                    <p className="text-sm text-green-700">Annual Savings</p>
                    <p className="text-2xl font-bold text-green-700">${calc.yearly.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Easy Migration Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Switching is Easy (We Do the Work!)
            </h2>
            <p className="text-xl text-gray-600">
              Free data migration included • Usually done same day
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {migrationSteps.map((step) => (
              <div key={step.step} className="relative">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 text-center h-full">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {step.step}
                  </div>
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mt-4 mb-4">
                    <step.icon className="h-7 w-7 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-6 py-3 rounded-full">
              <Timer className="h-5 w-5" />
              <span className="font-medium">Average migration time: Less than 24 hours</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Business Owners Who Made the Switch
            </h2>
            <p className="text-xl text-gray-600">
              Real savings from real cleaning businesses
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
                <div className="border-t border-gray-100 pt-4">
                  <p className="font-bold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-500 mb-3">{testimonial.company}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 line-through">
                      Switched from {testimonial.previousSoftware}
                    </span>
                    <span className="bg-green-100 text-green-700 text-sm font-bold px-3 py-1 rounded-full">
                      Saves {testimonial.savings}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BookingKoala Meltdown Callout */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="text-6xl">⚠️</div>
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  Remember the BookingKoala Meltdown?
                </h3>
                <p className="text-lg text-gray-700 mb-4">
                  In 2024, BookingKoala had major outages that left thousands of cleaning businesses
                  unable to accept bookings or process payments. Some businesses lost thousands in revenue.
                </p>
                <p className="text-lg text-gray-700">
                  <strong>CleanDay is built different.</strong> We use enterprise-grade infrastructure
                  with 99.9% uptime guarantee. Your business deserves reliable software.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-600 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Stop Overpaying?
          </h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of cleaning businesses who switched to CleanDay and
            are saving thousands of dollars every year.
          </p>

          <SwitchPageCTA variant="final" />

          <div className="flex flex-wrap justify-center gap-6 text-green-100">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Free data migration</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">CleanDay CRM</span>
              </div>
              <p className="text-sm">
                The affordable all-in-one platform for cleaning businesses.
                Built by people who understand your business.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-white">Features</Link></li>
                <li><Link href="/compare" className="hover:text-white">Compare</Link></li>
                <li><Link href="/switch" className="hover:text-white">Switch & Save</Link></li>
                <li><Link href="/tutorials" className="hover:text-white">Tutorials</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
                <li><Link href="/product-release" className="hover:text-white">Product Updates</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} CleanDay CRM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
