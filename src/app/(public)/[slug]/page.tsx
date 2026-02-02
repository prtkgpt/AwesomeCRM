import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle,
  Shield,
  Clock,
  Sparkles,
  Star,
  ArrowRight,
  Heart,
  Award,
  Users,
} from 'lucide-react';

interface CompanyLandingPageProps {
  params: {
    slug: string;
  };
}

export default async function CompanyLandingPage({ params }: CompanyLandingPageProps) {
  const { slug } = params;

  const company = await prisma.company.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      address: true,
      logo: true,
      primaryColor: true,
      businessType: true,
      timezone: true,
      onlineBookingEnabled: true,
      googleReviewUrl: true,
      yelpReviewUrl: true,
      hourlyRate: true,
      _count: {
        select: {
          bookings: true,
          clients: true,
        },
      },
    },
  });

  if (!company) {
    notFound();
  }

  const primaryColor = company.primaryColor || '#3B82F6';
  const businessTypes = company.businessType || ['RESIDENTIAL'];
  const serviceLabel = businessTypes.includes('COMMERCIAL')
    ? 'Commercial & Residential'
    : 'Residential';

  // Helper to lighten the primary color for backgrounds
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };
  const rgb = hexToRgb(primaryColor);

  return (
    <div className="min-h-screen bg-white">
      {/* ====== NAVIGATION ====== */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company.logo ? (
              <img
                src={company.logo}
                alt={company.name}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {company.name.charAt(0)}
              </div>
            )}
            <span className="font-bold text-gray-900 text-lg hidden sm:inline">{company.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {company.phone && (
              <a
                href={`tel:${company.phone}`}
                className="hidden md:flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Phone className="h-4 w-4" />
                {company.phone}
              </a>
            )}
            <Link href={`/${company.slug}/login`}>
              <Button variant="outline" size="sm" className="text-sm">
                Sign In
              </Button>
            </Link>
            {company.onlineBookingEnabled && (
              <Link href={`/${company.slug}/book`}>
                <Button
                  size="sm"
                  className="text-sm text-white shadow-md hover:shadow-lg transition-shadow"
                  style={{ backgroundColor: primaryColor }}
                >
                  Book Now
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ====== HERO SECTION ====== */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}15 50%, ${primaryColor}05 100%)`,
        }}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
            style={{ backgroundColor: primaryColor }}
          />
          <div
            className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.07]"
            style={{ backgroundColor: primaryColor }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-3xl">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
              style={{
                backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
                color: primaryColor,
              }}
            >
              <Sparkles className="h-4 w-4" />
              Professional {serviceLabel} Cleaning
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              A Cleaner Home,{' '}
              <span style={{ color: primaryColor }}>A Happier Life</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl leading-relaxed">
              {company.name} provides trusted, top-quality cleaning services tailored to your needs.
              Book in minutes and enjoy a spotless space — every time.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              {company.onlineBookingEnabled && (
                <Link href={`/${company.slug}/book`}>
                  <Button
                    size="lg"
                    className="text-base px-8 py-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    Get a Free Quote
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
              {company.phone && (
                <a href={`tel:${company.phone}`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-base px-8 py-6 border-gray-300 hover:border-gray-400"
                  >
                    <Phone className="mr-2 h-5 w-5" />
                    Call Us Today
                  </Button>
                </a>
              )}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-6 mt-10 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" style={{ color: primaryColor }} />
                Licensed & Insured
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4" style={{ color: primaryColor }} />
                5-Star Rated
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4" style={{ color: primaryColor }} />
                100% Satisfaction
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== SERVICES SECTION ====== */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Cleaning Services
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              From routine upkeep to deep cleans — we handle it all so you don&#39;t have to.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Standard Cleaning',
                desc: 'Regular maintenance cleaning to keep your home fresh and tidy. Dusting, vacuuming, mopping, and bathroom sanitizing.',
                icon: Sparkles,
                tag: 'Most Popular',
              },
              {
                title: 'Deep Cleaning',
                desc: 'A thorough, top-to-bottom clean. Baseboards, inside appliances, window tracks, and every overlooked corner.',
                icon: Award,
                tag: null,
              },
              {
                title: 'Move In / Move Out',
                desc: 'Get your deposit back or start fresh. Complete cleaning of empty or near-empty spaces, including closets and cabinets.',
                icon: Users,
                tag: null,
              },
            ].map((service, idx) => (
              <div
                key={idx}
                className="group relative bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-transparent transition-all duration-300 hover:-translate-y-1"
              >
                {service.tag && (
                  <span
                    className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {service.tag}
                  </span>
                )}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)` }}
                >
                  <service.icon className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-gray-500 leading-relaxed mb-4">{service.desc}</p>
                {company.onlineBookingEnabled && (
                  <Link
                    href={`/${company.slug}/book`}
                    className="inline-flex items-center text-sm font-semibold transition-colors"
                    style={{ color: primaryColor }}
                  >
                    Book This Service <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== WHY CHOOSE US ====== */}
      <section
        className="py-16 md:py-24"
        style={{
          background: `linear-gradient(180deg, ${primaryColor}05 0%, ${primaryColor}10 100%)`,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Customers Choose {company.name}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Shield,
                title: 'Insured & Bonded',
                desc: 'Fully covered for your peace of mind. Your home and belongings are always protected.',
              },
              {
                icon: Clock,
                title: 'Flexible Scheduling',
                desc: 'Book at times that work for you — mornings, evenings, or weekends. We adapt to your life.',
              },
              {
                icon: CheckCircle,
                title: 'Vetted Professionals',
                desc: 'Every cleaner is background-checked, trained, and committed to delivering top results.',
              },
              {
                icon: Heart,
                title: 'Satisfaction Guaranteed',
                desc: 'Not happy? We\'ll come back and make it right — no questions asked.',
              },
            ].map((feature, idx) => (
              <div key={idx} className="text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)` }}
                >
                  <feature.icon className="h-7 w-7" style={{ color: primaryColor }} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Book in 3 Easy Steps
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Getting your space cleaned has never been easier
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Choose Your Service',
                desc: 'Select the type of cleaning you need and tell us about your space.',
              },
              {
                step: '2',
                title: 'Pick a Date & Time',
                desc: 'Choose a convenient slot from our available schedule.',
              },
              {
                step: '3',
                title: 'Relax & Enjoy',
                desc: 'Our team arrives on time and handles everything. Come home to a spotless space.',
              },
            ].map((item, idx) => (
              <div key={idx} className="relative text-center">
                {idx < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200" />
                )}
                <div
                  className="relative inline-flex items-center justify-center w-16 h-16 rounded-full text-white text-2xl font-bold mb-5 shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  {item.step}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CONTACT & REVIEWS ====== */}
      <section
        className="py-16 md:py-24"
        style={{
          background: `linear-gradient(180deg, white 0%, ${primaryColor}08 100%)`,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Contact Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
              <div className="space-y-5">
                {company.phone && (
                  <a
                    href={`tel:${company.phone}`}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)` }}
                    >
                      <Phone className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Call or Text</p>
                      <p className="font-semibold text-gray-900 group-hover:underline">{company.phone}</p>
                    </div>
                  </a>
                )}
                {company.email && (
                  <a
                    href={`mailto:${company.email}`}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)` }}
                    >
                      <Mail className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email Us</p>
                      <p className="font-semibold text-gray-900 group-hover:underline break-all">{company.email}</p>
                    </div>
                  </a>
                )}
                {company.address && (
                  <div className="flex items-center gap-4 p-4 rounded-xl">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)` }}
                    >
                      <MapPin className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Service Area</p>
                      <p className="font-semibold text-gray-900">{company.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reviews & CTA Card */}
            <div
              className="rounded-2xl p-8 text-white relative overflow-hidden"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

              <div className="relative">
                <h2 className="text-2xl font-bold mb-4">Ready for a Spotless Home?</h2>
                <p className="text-white/80 mb-8 leading-relaxed">
                  Join hundreds of happy customers who trust {company.name} for their cleaning needs.
                  Book your first cleaning today!
                </p>

                {company.onlineBookingEnabled && (
                  <Link href={`/${company.slug}/book`}>
                    <Button
                      size="lg"
                      className="bg-white hover:bg-gray-100 text-gray-900 font-semibold px-8 py-6 shadow-lg hover:shadow-xl transition-all"
                    >
                      <Calendar className="mr-2 h-5 w-5" />
                      Schedule Your Cleaning
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}

                {/* Review links */}
                {(company.googleReviewUrl || company.yelpReviewUrl) && (
                  <div className="mt-8 pt-6 border-t border-white/20">
                    <p className="text-sm text-white/60 mb-3">See what our customers say</p>
                    <div className="flex gap-3">
                      {company.googleReviewUrl && (
                        <a
                          href={company.googleReviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Star className="h-4 w-4" />
                          Google Reviews
                        </a>
                      )}
                      {company.yelpReviewUrl && (
                        <a
                          href={company.yelpReviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Star className="h-4 w-4" />
                          Yelp Reviews
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FINAL CTA BANNER ====== */}
      {company.onlineBookingEnabled && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div
              className="rounded-2xl p-10 md:p-14 text-center relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}10 0%, ${primaryColor}20 100%)`,
              }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Your Clean Home is One Click Away
              </h2>
              <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">
                No contracts, no hassle. Book online in under 2 minutes and let us take care of the rest.
              </p>
              <Link href={`/${company.slug}/book`}>
                <Button
                  size="lg"
                  className="text-base px-10 py-6 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Calendar className="mr-2 h-5 w-5" />
                  Book Your Cleaning Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ====== FOOTER ====== */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  className="h-8 w-auto object-contain brightness-0 invert opacity-80"
                />
              ) : (
                <span className="font-bold text-white">{company.name}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              {company.phone && (
                <a href={`tel:${company.phone}`} className="hover:text-white transition-colors flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {company.phone}
                </a>
              )}
              {company.email && (
                <a href={`mailto:${company.email}`} className="hover:text-white transition-colors flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {company.email}
                </a>
              )}
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} {company.name}</p>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
            Powered by{' '}
            <a href="https://cleandaycrm.com" className="hover:text-gray-300 transition-colors">
              CleanDayCRM
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CompanyLandingPageProps) {
  const { slug } = params;

  const company = await prisma.company.findUnique({
    where: { slug },
    select: {
      name: true,
      businessType: true,
    },
  });

  if (!company) {
    return {
      title: 'Company Not Found',
    };
  }

  const businessTypes = company.businessType || ['RESIDENTIAL'];
  const serviceType = businessTypes.includes('COMMERCIAL')
    ? 'Commercial & Residential'
    : 'Residential';

  return {
    title: `${company.name} - Professional ${serviceType} Cleaning Services`,
    description: `Book professional ${serviceType.toLowerCase()} cleaning services with ${company.name}. Easy online booking, vetted professionals, satisfaction guaranteed.`,
  };
}
