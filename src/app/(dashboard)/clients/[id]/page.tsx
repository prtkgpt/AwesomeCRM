'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Mail, Phone, MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import type { ClientWithAddresses, BookingWithRelations } from '@/types';

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientWithAddresses | null>(null);
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchClient();
    fetchBookings();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      const data = await response.json();

      if (data.success) {
        setClient(data.data);
      } else {
        router.push('/clients');
      }
    } catch (error) {
      console.error('Failed to fetch client:', error);
      router.push('/clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await fetch(`/api/bookings?clientId=${clientId}`);
      const data = await response.json();

      if (data.success) {
        setBookings(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this client? All associated bookings will also be deleted.'
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        router.push('/clients');
      } else {
        alert(data.error || 'Failed to delete client');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-700';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-700';
      case 'NO_SHOW':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!client) {
    return null;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            {client.tags.length > 0 && (
              <div className="flex gap-1 mt-1">
                {client.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-lg">Contact Information</h2>

        {client.email && (
          <div className="flex items-center gap-2 text-gray-700">
            <Mail className="h-4 w-4 text-gray-400" />
            <a href={`mailto:${client.email}`} className="hover:underline">
              {client.email}
            </a>
          </div>
        )}

        {client.phone && (
          <div className="flex items-center gap-2 text-gray-700">
            <Phone className="h-4 w-4 text-gray-400" />
            <a href={`tel:${client.phone}`} className="hover:underline">
              {client.phone}
            </a>
          </div>
        )}

        {client.addresses.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              Addresses
            </h3>
            {client.addresses.map((address) => (
              <div
                key={address.id}
                className="pl-6 text-sm text-gray-600 border-l-2 border-gray-200"
              >
                <div>{address.street}</div>
                {address.unit && <div>Unit {address.unit}</div>}
                <div>
                  {address.city}, {address.state} {address.zip}
                </div>
                {address.isDefault && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded mt-1 inline-block">
                    Default
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {client.notes && (
          <div className="pt-2 border-t">
            <h3 className="font-medium text-sm mb-1">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {client.notes}
            </p>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Jobs</h2>
        <Link href={`/jobs/new?clientId=${clientId}`}>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Job
          </Button>
        </Link>
      </div>

      {bookings.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <p className="mb-4">No jobs yet for this client</p>
          <Link href={`/jobs/new?clientId=${clientId}`}>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Create First Job
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Link key={booking.id} href={`/jobs/${booking.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                      {booking.isRecurring && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                          Recurring
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDateTime(booking.scheduledDate)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {booking.address.street}, {booking.address.city}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {booking.serviceType} • {booking.duration} min
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(booking.price)}
                    </div>
                    {!booking.isPaid && booking.status === 'COMPLETED' && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                        Unpaid
                      </span>
                    )}
                    {booking.isPaid && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        Paid
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
