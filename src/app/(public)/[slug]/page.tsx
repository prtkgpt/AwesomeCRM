import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Phone, Mail, MapPin, Calendar, CheckCircle } from 'lucide-react';

interface CompanyLandingPageProps {
  params: {
    slug: string;
  };
}

export default async function CompanyLandingPage({ params }: CompanyLandingPageProps) {
  const { slug } = params;

  // Fetch company data
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
    },
  });

  if (!company) {
    notFound();
  }

  const primaryColor = company.primaryColor || '#3B82F6';
  const businessTypes = company.businessType || ['RESIDENTIAL'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header/Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          {company.logo && (
            <div className="mb-8 flex justify-center">
              <img
                src={company.logo}
                alt={`${company.name} logo`}
                className="h-24 w-auto object-contain"
              />
            </div>
          )}

          {/* Company Name */}
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {company.name}
          </h1>

          {/* Business Type */}
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Professional {businessTypes.includes('COMMERCIAL') ? 'Commercial & ' : ''}
            {businessTypes.includes('RESIDENTIAL') ? 'Residential ' : ''}
            Cleaning Services
          </p>

          {/* CTA Button */}
          {company.onlineBookingEnabled && (
            <Link href={`/${company.slug}/book`}>
              <Button
                size="lg"
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow"
                style={{ backgroundColor: primaryColor }}
              >
                <Calendar className="mr-2 h-5 w-5" />
                Book Now
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 mb-8">
            <h2 className="text-3xl font-bold text-center mb-8">Why Choose Us?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <CheckCircle className="h-8 w-8" style={{ color: primaryColor }} />
                </div>
                <h3 className="font-semibold text-lg mb-2">Professional Service</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Experienced cleaners dedicated to excellence
                </p>
              </div>
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <CheckCircle className="h-8 w-8" style={{ color: primaryColor }} />
                </div>
                <h3 className="font-semibold text-lg mb-2">Easy Booking</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Book online in minutes, no phone calls needed
                </p>
              </div>
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <CheckCircle className="h-8 w-8" style={{ color: primaryColor }} />
                </div>
                <h3 className="font-semibold text-lg mb-2">Satisfaction Guaranteed</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  We stand behind our work with a quality guarantee
                </p>
              </div>
            </div>
          </Card>

          {/* Contact Information */}
          <Card className="p-8">
            <h2 className="text-3xl font-bold text-center mb-8">Get in Touch</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {company.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 mt-1 text-gray-600 dark:text-gray-400" />
                  <div>
                    <h3 className="font-semibold mb-1">Phone</h3>
                    <a
                      href={`tel:${company.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {company.phone}
                    </a>
                  </div>
                </div>
              )}
              {company.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 mt-1 text-gray-600 dark:text-gray-400" />
                  <div>
                    <h3 className="font-semibold mb-1">Email</h3>
                    <a
                      href={`mailto:${company.email}`}
                      className="text-blue-600 hover:underline break-all"
                    >
                      {company.email}
                    </a>
                  </div>
                </div>
              )}
              {company.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 mt-1 text-gray-600 dark:text-gray-400" />
                  <div>
                    <h3 className="font-semibold mb-1">Location</h3>
                    <p className="text-gray-600 dark:text-gray-400">{company.address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Review Links */}
            {(company.googleReviewUrl || company.yelpReviewUrl) && (
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-center mb-4">Read Our Reviews</h3>
                <div className="flex justify-center gap-4">
                  {company.googleReviewUrl && (
                    <a
                      href={company.googleReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Google Reviews
                    </a>
                  )}
                  {company.yelpReviewUrl && (
                    <a
                      href={company.yelpReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Yelp Reviews
                    </a>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Footer CTA */}
      {company.onlineBookingEnabled && (
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Book your cleaning service online today and experience the difference
            </p>
            <Link href={`/${company.slug}/book`}>
              <Button
                size="lg"
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow"
                style={{ backgroundColor: primaryColor }}
              >
                <Calendar className="mr-2 h-5 w-5" />
                Book Your Cleaning
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} {company.name}. All rights reserved.</p>
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
    description: `Book professional ${serviceType.toLowerCase()} cleaning services with ${company.name}. Easy online booking, satisfaction guaranteed.`,
  };
}
