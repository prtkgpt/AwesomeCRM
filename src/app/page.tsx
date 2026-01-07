import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { Calendar, DollarSign, MessageSquare, Clock, CheckCircle, Smartphone, Users, TrendingUp, Shield, Zap, Star, ArrowRight, CheckCheck } from 'lucide-react';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/calendar');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">CleanDay CRM</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/compare"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium hidden md:inline"
            >
              Compare
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

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20 text-center">
        <div className="max-w-5xl mx-auto">
          {/* Limited Time Offer Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-full mb-6 animate-pulse">
            <Star className="h-4 w-4" />
            <span className="font-semibold text-sm">SPECIAL LAUNCH OFFER - First 100 Customers Only!</span>
            <Star className="h-4 w-4" />
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Grow Your Cleaning Business
            <br />
            <span className="text-blue-600">Without the Expensive Software</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-4 max-w-3xl mx-auto">
            Everything you need to run your cleaning business: Scheduling, Client Management, Payments, Team Management, and More.
          </p>
          <p className="text-lg md:text-xl text-gray-600 mb-8">
            Get <span className="font-bold text-blue-600">$197/month worth of features</span> for just <span className="font-bold text-green-600">$20/month</span>
          </p>

          {/* Pricing Card in Hero */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 max-w-2xl mx-auto border-4 border-blue-500 mb-8">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg inline-block mb-4">
              <span className="font-bold">90% OFF - Launch Special</span>
            </div>

            <div className="mb-6">
              <div className="flex items-end justify-center gap-3 mb-2">
                <span className="text-2xl text-gray-400 line-through">$197</span>
                <div className="text-6xl md:text-7xl font-bold text-gray-900">
                  $20
                  <span className="text-3xl text-gray-500">/mo</span>
                </div>
              </div>
              <p className="text-red-600 font-semibold">Only available for the first 100 customers!</p>
            </div>

            <div className="flex flex-col gap-3 mb-6">
              <a
                href="https://buy.stripe.com/dRmfZh05U92v41S1rZ6Zy00"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-lg font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-colors shadow-lg"
              >
                Subscribe Now - $20/month
              </a>
              <Link
                href="/signup"
                className="block w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                Start Free Trial First
              </Link>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              14-day free trial • Cancel anytime • No long-term contracts
            </p>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 mb-2">Secure payment powered by Stripe</p>
              <p className="text-xs text-gray-600">
                Click "Subscribe Now" to complete your payment securely via Stripe
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Built by experienced home care professionals</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Mobile app coming in 10 days</span>
            </div>
          </div>

          {/* Mobile App Coming Soon */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-full inline-flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            <span className="font-semibold">iOS & Android Apps Coming Soon (10 days or less!)</span>
          </div>
        </div>
      </section>

      {/* Why CleanDay vs Competitors */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-r from-blue-600 to-blue-700 -mx-4 text-white">
        <div className="max-w-6xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Why Cleaning Businesses Choose CleanDay
          </h2>
          <p className="text-xl text-blue-100">
            BookingKoala, ZenMaid, and Jobber cost $197-$499/month. We give you more for just $20/month.
          </p>
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 mt-6 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            See Detailed Comparison
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl">
            <div className="text-4xl font-bold mb-2">$20</div>
            <div className="text-blue-100 mb-2">CleanDay CRM</div>
            <div className="text-sm text-blue-200">All features included</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl opacity-75">
            <div className="text-4xl font-bold mb-2">$197</div>
            <div className="text-blue-100 mb-2">BookingKoala</div>
            <div className="text-sm text-blue-200">Basic plan</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl opacity-75">
            <div className="text-4xl font-bold mb-2">$297</div>
            <div className="text-blue-100 mb-2">ZenMaid</div>
            <div className="text-sm text-blue-200">Pro plan</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl opacity-75">
            <div className="text-4xl font-bold mb-2">$499</div>
            <div className="text-blue-100 mb-2">Jobber</div>
            <div className="text-sm text-blue-200">Premium plan</div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">30 sec</div>
              <div className="text-gray-600 font-medium">To book a new job</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-green-600 mb-2">2.5x</div>
              <div className="text-gray-600 font-medium">Faster payments</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-purple-600 mb-2">100%</div>
              <div className="text-gray-600 font-medium">Mobile-friendly</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            Everything Your Cleaning Business Needs
          </h2>
          <p className="text-xl text-center text-gray-600 mb-12">
            No more juggling between 5 different apps. Everything in one place.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Smart Scheduling
              </h3>
              <p className="text-gray-700">
                Visual calendar, drag-and-drop booking, recurring jobs, team assignments, and automated reminders.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Get Paid Instantly
              </h3>
              <p className="text-gray-700">
                Stripe integration, payment links via SMS, auto-charge cards on file, invoice generation, and payment tracking.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Client Management
              </h3>
              <p className="text-gray-700">
                Store all client info, preferences, gate codes, special instructions, service history, and more.
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Team Management
              </h3>
              <p className="text-gray-700">
                Assign cleaners, track time, manage schedules, payroll tracking, and performance monitoring.
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-xl border border-pink-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Automated Communication
              </h3>
              <p className="text-gray-700">
                SMS reminders, confirmations, thank you messages, review requests, and customer feedback collection.
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl border border-indigo-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Business Analytics
              </h3>
              <p className="text-gray-700">
                Revenue reports, client lifetime value, team performance, booking trends, and growth insights.
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center mb-4">
                <CheckCheck className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Estimates & Invoices
              </h3>
              <p className="text-gray-700">
                Create professional estimates, send for approval, auto-convert to invoices, and track payments.
              </p>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-xl border border-teal-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Insurance Tracking
              </h3>
              <p className="text-gray-700">
                Track insurance claims, copay collection, documentation, and handle insurance billing seamlessly.
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Mobile-First Design
              </h3>
              <p className="text-gray-700">
                Works perfectly on phones and tablets. Native iOS/Android apps launching in 10 days!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-16 bg-gray-50 -mx-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-center text-gray-900 mb-12">
            What Cleaning Business Owners Say
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "Switched from BookingKoala and saved $177/month! CleanDay has everything I need without the bloat."
              </p>
              <div className="font-semibold text-gray-900">Sarah M.</div>
              <div className="text-sm text-gray-500">Sparkle Clean Services</div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "Finally, software that doesn't cost more than my cleaners! The payment links are a game-changer."
              </p>
              <div className="font-semibold text-gray-900">Mike T.</div>
              <div className="text-sm text-gray-500">Crystal Clear Cleaning</div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "Grew from 5 to 50 clients using CleanDay. The recurring bookings feature alone pays for itself."
              </p>
              <div className="font-semibold text-gray-900">Lisa R.</div>
              <div className="text-sm text-gray-500">Elite Home Cleaning</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white shadow-2xl">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Join Cleaning Businesses Growing with CleanDay
          </h2>
          <p className="text-xl mb-2 text-blue-100">
            Lock in the $20/month launch price before it goes up to $197/month
          </p>
          <p className="text-lg mb-8 text-yellow-300 font-semibold">
            Only 100 spots available at this price!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <a
              href="https://buy.stripe.com/dRmfZh05U92v41S1rZ6Zy00"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Subscribe Now - $20/month
            </a>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-blue-600 border-2 border-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              Start Free Trial First
            </Link>
          </div>

          <p className="text-sm text-blue-100">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">CleanDay CRM</span>
              </div>
              <p className="text-sm text-gray-600">
                The affordable CRM built specifically for cleaning businesses.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/compare" className="text-gray-600 hover:text-gray-900">
                    Compare vs Competitors
                  </Link>
                </li>
                <li>
                  <Link href="/#features" className="text-gray-600 hover:text-gray-900">
                    Features
                  </Link>
                </li>
                <li>
                  <span className="text-gray-600">Pricing - $20/month</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:prateek@prateekgupta.org" className="text-gray-600 hover:text-gray-900">
                    Contact Support
                  </a>
                </li>
                <li>
                  <Link href="/login" className="text-gray-600 hover:text-gray-900">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="text-gray-600 hover:text-gray-900">
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Coming Soon</h3>
              <ul className="space-y-2 text-sm">
                <li className="text-gray-600 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  iOS App (10 days)
                </li>
                <li className="text-gray-600 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Android App (10 days)
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
            <div>
              © 2026 CleanDay CRM. Built for cleaning businesses who deserve affordable software.
            </div>
            <div className="flex gap-6">
              <a href="mailto:prateek@prateekgupta.org" className="hover:text-gray-900">
                Contact
              </a>
              <Link href="/compare" className="hover:text-gray-900">
                Compare
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
