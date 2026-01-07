import Link from 'next/link';
import { Calendar, Check, X, DollarSign, Star, ArrowLeft, Zap } from 'lucide-react';

export const metadata = {
  title: 'CleanDay vs BookingKoala vs ZenMaid vs Jobber - Comparison',
  description: 'Compare CleanDay CRM with BookingKoala, ZenMaid, and Jobber. See why cleaning businesses are switching to save $177-$479/month.',
};

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">CleanDay CRM</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-12 md:py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2 rounded-full mb-6">
            <Star className="h-4 w-4" />
            <span className="font-semibold text-sm">SAVE $177-$479/MONTH</span>
            <Star className="h-4 w-4" />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Why Pay 10x More for the
            <br />
            <span className="text-blue-600">Same Features?</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            CleanDay CRM gives you everything BookingKoala, ZenMaid, and Jobber offer—
            <br className="hidden md:block" />
            for a fraction of the price.
          </p>

          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border-2 border-blue-500">
            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div className="border-2 border-green-500 rounded-xl p-4 bg-green-50">
                <div className="text-3xl font-bold text-green-600 mb-1">$20</div>
                <div className="font-semibold text-gray-900 mb-1">CleanDay</div>
                <div className="text-sm text-gray-600">All Features</div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="text-3xl font-bold text-gray-900 mb-1">$197</div>
                <div className="font-semibold text-gray-900 mb-1">BookingKoala</div>
                <div className="text-sm text-red-600 font-medium">+$177/mo</div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="text-3xl font-bold text-gray-900 mb-1">$297</div>
                <div className="font-semibold text-gray-900 mb-1">ZenMaid</div>
                <div className="text-sm text-red-600 font-medium">+$277/mo</div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="text-3xl font-bold text-gray-900 mb-1">$499</div>
                <div className="font-semibold text-gray-900 mb-1">Jobber</div>
                <div className="text-sm text-red-600 font-medium">+$479/mo</div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800">
                Save $2,124 - $5,748 per year by switching to CleanDay CRM!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Comparison Table */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            Feature-by-Feature Comparison
          </h2>
          <p className="text-center text-gray-600 mb-12 text-lg">
            See exactly what you get with each platform
          </p>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-center p-4 font-semibold bg-green-600">
                      <div>CleanDay</div>
                      <div className="text-sm font-normal">$20/mo</div>
                    </th>
                    <th className="text-center p-4 font-semibold">
                      <div>BookingKoala</div>
                      <div className="text-sm font-normal">$197/mo</div>
                    </th>
                    <th className="text-center p-4 font-semibold">
                      <div>ZenMaid</div>
                      <div className="text-sm font-normal">$297/mo</div>
                    </th>
                    <th className="text-center p-4 font-semibold">
                      <div>Jobber</div>
                      <div className="text-sm font-normal">$499/mo</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Core Features */}
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="p-4 font-bold text-gray-900 text-lg">
                      Core Scheduling & Booking
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700">Calendar & Scheduling</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 text-gray-700">Recurring Jobs (Weekly, Monthly)</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700">Drag & Drop Scheduling</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 text-gray-700">Team Assignment & Management</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>

                  {/* Client Management */}
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="p-4 font-bold text-gray-900 text-lg">
                      Client Management
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700">Unlimited Clients</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 text-gray-700">Client Notes & Preferences</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700">Service History Tracking</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>

                  {/* Payments */}
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="p-4 font-bold text-gray-900 text-lg">
                      Payments & Billing
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700">Stripe Integration</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 text-gray-700">Payment Links via SMS</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700">Auto-Charge Cards on File</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 text-gray-700">Invoice Generation</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>

                  {/* Communication */}
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="p-4 font-bold text-gray-900 text-lg">
                      Communication & Automation
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700">Automated SMS Reminders</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 text-gray-700">Customer Feedback Collection</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700">Review Requests</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>

                  {/* Reports */}
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="p-4 font-bold text-gray-900 text-lg">
                      Reports & Analytics
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700">Revenue Reports</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 text-gray-700">Team Performance Tracking</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700">Client Lifetime Value</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><X className="h-6 w-6 text-gray-400 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>

                  {/* Insurance */}
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="p-4 font-bold text-gray-900 text-lg">
                      Insurance & Specialized Features
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700 font-semibold">Insurance Billing & Copay</td>
                    <td className="p-4 text-center bg-green-50">
                      <Check className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <div className="text-xs text-green-700 font-semibold">Included</div>
                    </td>
                    <td className="p-4 text-center">
                      <X className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <div className="text-xs text-gray-500">Not Available</div>
                    </td>
                    <td className="p-4 text-center">
                      <X className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <div className="text-xs text-gray-500">Not Available</div>
                    </td>
                    <td className="p-4 text-center">
                      <X className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <div className="text-xs text-gray-500">Not Available</div>
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 text-gray-700 font-semibold">Tip Collection</td>
                    <td className="p-4 text-center bg-green-50">
                      <Check className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <div className="text-xs text-green-700 font-semibold">Included</div>
                    </td>
                    <td className="p-4 text-center">
                      <X className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <div className="text-xs text-gray-500">Not Available</div>
                    </td>
                    <td className="p-4 text-center">
                      <X className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <div className="text-xs text-gray-500">Not Available</div>
                    </td>
                    <td className="p-4 text-center">
                      <X className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <div className="text-xs text-gray-500">Not Available</div>
                    </td>
                  </tr>

                  {/* Mobile */}
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="p-4 font-bold text-gray-900 text-lg">
                      Mobile Experience
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700">Mobile-Responsive Web App</td>
                    <td className="p-4 text-center bg-green-50"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 text-gray-700 font-semibold">Native iOS & Android Apps</td>
                    <td className="p-4 text-center bg-green-50">
                      <Zap className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
                      <div className="text-xs text-green-700 font-semibold">Coming in 10 days!</div>
                    </td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="h-6 w-6 text-green-600 mx-auto" /></td>
                  </tr>

                  {/* Pricing Row */}
                  <tr className="bg-gradient-to-r from-blue-100 to-blue-50">
                    <td className="p-6 font-bold text-gray-900 text-xl">Monthly Price</td>
                    <td className="p-6 text-center bg-green-100">
                      <div className="text-4xl font-bold text-green-600">$20</div>
                      <div className="text-sm text-gray-600 mt-1">Launch Special</div>
                      <div className="text-xs text-red-600 font-semibold mt-1">90% OFF!</div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="text-4xl font-bold text-gray-900">$197</div>
                      <div className="text-sm text-gray-500 mt-1">Standard</div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="text-4xl font-bold text-gray-900">$297</div>
                      <div className="text-sm text-gray-500 mt-1">Pro Plan</div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="text-4xl font-bold text-gray-900">$499</div>
                      <div className="text-sm text-gray-500 mt-1">Premium</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose CleanDay */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-r from-blue-600 to-purple-600 -mx-4">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Why Cleaning Businesses Love CleanDay
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div>
              <DollarSign className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Affordable Pricing</h3>
              <p className="text-blue-100">
                Same features as the big guys, but 90% cheaper. Reinvest savings into your business.
              </p>
            </div>
            <div>
              <Zap className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Easy to Use</h3>
              <p className="text-blue-100">
                Built specifically for cleaning businesses. No complicated setup. Start in minutes.
              </p>
            </div>
            <div>
              <Star className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">All-in-One Solution</h3>
              <p className="text-blue-100">
                Everything from scheduling to payments to team management in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
            Ready to Save $177-$479/Month?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join 500+ cleaning businesses who switched to CleanDay and never looked back.
          </p>

          <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-blue-500 mb-8">
            <div className="flex items-end justify-center gap-3 mb-4">
              <span className="text-2xl text-gray-400 line-through">$197</span>
              <div className="text-6xl font-bold text-gray-900">
                $20
                <span className="text-3xl text-gray-500">/mo</span>
              </div>
            </div>
            <p className="text-red-600 font-semibold mb-6">First 100 customers only!</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <a
                href="https://www.paypal.com/paypalme/prateekguptaorg/20"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold bg-[#0070BA] text-white rounded-lg hover:bg-[#005ea6] transition-colors shadow-lg"
              >
                Pay with PayPal - Start Now
              </a>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Start Free Trial First
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              14-day free trial • No credit card required • Cancel anytime
            </p>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
            <p className="text-gray-800 font-semibold text-lg">
              Switch from BookingKoala, ZenMaid, or Jobber and we'll help you migrate for FREE!
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">CleanDay CRM</span>
          </div>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-gray-900">
              Home
            </Link>
            <Link href="/login" className="hover:text-gray-900">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-gray-900">
              Sign Up
            </Link>
          </div>
          <div className="text-gray-500">
            © 2026 CleanDay CRM. Built for cleaning businesses.
          </div>
        </div>
      </footer>
    </div>
  );
}
