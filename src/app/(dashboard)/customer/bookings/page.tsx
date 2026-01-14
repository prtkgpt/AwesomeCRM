'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, DollarSign, Star } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { ReviewModal } from '@/components/review/review-modal';

interface Booking {
  id: string;
  scheduledDate: string;
  duration: number;
  serviceType: string;
  status: string;
  price: number;
  notes: string | null;
  customerRating: number | null;
  customerFeedback: string | null;
  assignee?: {
    user: {
      name: string;
    };
  } | null;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export default function CustomerBookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchBookings();
    }
  }, [status, filter, router]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customer/bookings?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleLeaveReview = (booking: Booking) => {
    setSelectedBooking(booking);
    setReviewModalOpen(true);
  };

  const handleReviewSuccess = () => {
    // Refresh bookings to show the new review
    fetchBookings();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading your bookings...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">My Bookings</h1>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === 'upcoming'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === 'completed'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <p className="mb-4">No bookings found</p>
          <Button>Request New Service</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{booking.serviceType}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{formatDate(booking.scheduledDate)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{formatTime(booking.scheduledDate)} ({formatDuration(booking.duration)})</span>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                      <div>
                        <p>{booking.address.street}</p>
                        <p>{booking.address.city}, {booking.address.state} {booking.address.zip}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-2xl font-bold text-blue-600 mb-2">
                    <DollarSign className="h-6 w-6" />
                    <span>{booking.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {booking.notes && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{booking.notes}</p>
                </div>
              )}

              {/* Review Display/Button */}
              {booking.status === 'COMPLETED' && (
                <div className="mt-4">
                  {booking.customerRating ? (
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Your Review
                          </p>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-5 w-5 ${
                                  star <= (booking.customerRating || 0)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {booking.customerRating}/5
                            </span>
                          </div>
                          {booking.customerFeedback && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              "{booking.customerFeedback}"
                            </p>
                          )}
                        </div>
                        <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                          ✓ Reviewed
                        </span>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleLeaveReview(booking)}
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Leave a Review
                    </Button>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {booking.status === 'SCHEDULED' && (
                  <>
                    <Button variant="outline" size="sm">Reschedule</Button>
                    <Button variant="outline" size="sm">Cancel</Button>
                  </>
                )}
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && selectedBooking && (
        <ReviewModal
          bookingId={selectedBooking.id}
          serviceType={selectedBooking.serviceType}
          cleanerName={selectedBooking.assignee?.user?.name}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedBooking(null);
          }}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
}
