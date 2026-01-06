'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Phone, CheckCircle, Navigation, LogIn, LogOut, AlertCircle } from 'lucide-react';

interface Job {
  id: string;
  scheduledDate: string;
  duration: number;
  serviceType: string;
  status: string;
  price: number;
  notes: string | null;
  onMyWaySentAt: string | null;
  clockedInAt: string | null;
  clockedOutAt: string | null;
  client: {
    name: string;
    phone: string | null;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    gateCode: string | null;
    parkingInfo: string | null;
    petInfo: string | null;
  };
}

export default function CleanerDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [todayJobs, setTodayJobs] = useState<Job[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchJobs();
    }
  }, [status, router]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cleaner/jobs');
      if (res.ok) {
        const data = await res.json();
        setTodayJobs(data.todayJobs || []);
        setUpcomingJobs(data.upcomingJobs || []);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (jobId: string, action: 'on-my-way' | 'clock-in' | 'clock-out') => {
    setActionLoading(`${jobId}-${action}`);
    setError('');

    try {
      const res = await fetch(`/api/cleaner/jobs/${jobId}/${action}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const messages = {
          'on-my-way': data.smsSent
            ? '✅ Marked as "On My Way" and client was notified!'
            : `✅ Marked as "On My Way"${data.smsError ? ` (${data.smsError})` : ''}`,
          'clock-in': '✅ Clocked in successfully!',
          'clock-out': `✅ Clocked out! Job duration: ${data.duration} minutes`,
        };
        alert(messages[action]);
        fetchJobs(); // Refresh the list
      } else {
        setError(data.error || `Failed to ${action.replace('-', ' ')}`);
        alert(data.error || `Failed to ${action.replace('-', ' ')}`);
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      setError(`Failed to ${action.replace('-', ' ')}`);
      alert(`Failed to ${action.replace('-', ' ')}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkComplete = async (jobId: string) => {
    if (!confirm('Mark this job as completed?')) return;

    setActionLoading(`${jobId}-complete`);
    try {
      const res = await fetch(`/api/cleaner/jobs/${jobId}/complete`, {
        method: 'POST',
      });

      if (res.ok) {
        alert('Job marked as completed!');
        fetchJobs(); // Refresh the list
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to mark job as completed');
      }
    } catch (error) {
      console.error('Failed to complete job:', error);
      alert('Failed to mark job as completed');
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading your jobs...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Jobs</h1>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Today's Jobs */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Today's Schedule</h2>
        {todayJobs.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No jobs scheduled for today. Enjoy your day off!
          </Card>
        ) : (
          <div className="space-y-4">
            {todayJobs.map((job) => (
              <Card key={job.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{job.client.name}</h3>
                    <div className="flex items-center text-gray-600 mb-2">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{formatTime(job.scheduledDate)}</span>
                      <span className="mx-2">•</span>
                      <span>{job.duration} min</span>
                      <span className="mx-2">•</span>
                      <span className="font-medium">{job.serviceType}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    {/* On My Way Button */}
                    {!job.onMyWaySentAt && job.status === 'SCHEDULED' && (
                      <Button
                        onClick={() => handleAction(job.id, 'on-my-way')}
                        disabled={actionLoading === `${job.id}-on-my-way`}
                        size="sm"
                        variant="outline"
                        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        {actionLoading === `${job.id}-on-my-way` ? 'Sending...' : 'On My Way'}
                      </Button>
                    )}

                    {/* Clock In Button */}
                    {job.onMyWaySentAt && !job.clockedInAt && job.status === 'SCHEDULED' && (
                      <Button
                        onClick={() => handleAction(job.id, 'clock-in')}
                        disabled={actionLoading === `${job.id}-clock-in`}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        {actionLoading === `${job.id}-clock-in` ? 'Clocking In...' : 'Clock In'}
                      </Button>
                    )}

                    {/* Clock Out Button */}
                    {job.clockedInAt && !job.clockedOutAt && job.status === 'SCHEDULED' && (
                      <Button
                        onClick={() => handleAction(job.id, 'clock-out')}
                        disabled={actionLoading === `${job.id}-clock-out`}
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {actionLoading === `${job.id}-clock-out` ? 'Clocking Out...' : 'Clock Out'}
                      </Button>
                    )}

                    {/* Manual Complete Button (fallback) */}
                    {job.status === 'SCHEDULED' && !job.clockedInAt && !job.onMyWaySentAt && (
                      <Button
                        onClick={() => handleMarkComplete(job.id)}
                        disabled={actionLoading === `${job.id}-complete`}
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {actionLoading === `${job.id}-complete` ? 'Completing...' : 'Mark Complete'}
                      </Button>
                    )}

                    {/* Status Badges */}
                    {job.onMyWaySentAt && !job.clockedInAt && (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 text-center">
                        En Route
                      </span>
                    )}
                    {job.clockedInAt && !job.clockedOutAt && (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 text-center">
                        In Progress
                      </span>
                    )}
                    {job.status === 'COMPLETED' && (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 text-center">
                        Completed
                      </span>
                    )}
                  </div>
                </div>

                {/* Job Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5 text-gray-400" />
                    <div>
                      <p className="font-medium">{job.address.street}</p>
                      <p className="text-gray-600">
                        {job.address.city}, {job.address.state} {job.address.zip}
                      </p>
                    </div>
                  </div>

                  {job.client.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <a href={`tel:${job.client.phone}`} className="text-blue-600 hover:underline">
                        {job.client.phone}
                      </a>
                    </div>
                  )}

                  {/* Time Tracking Info */}
                  {(job.onMyWaySentAt || job.clockedInAt || job.clockedOutAt) && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
                      <p className="text-xs font-medium text-gray-800 mb-1">Time Tracking</p>
                      <div className="space-y-1 text-xs text-gray-600">
                        {job.onMyWaySentAt && (
                          <p>🚗 On My Way: {formatTime(job.onMyWaySentAt)}</p>
                        )}
                        {job.clockedInAt && (
                          <p>⏱️ Clocked In: {formatTime(job.clockedInAt)}</p>
                        )}
                        {job.clockedOutAt && (
                          <p>✅ Clocked Out: {formatTime(job.clockedOutAt)}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {job.address.gateCode && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs font-medium text-yellow-800 mb-1">Gate Code</p>
                      <p className="font-mono">{job.address.gateCode}</p>
                    </div>
                  )}

                  {job.address.parkingInfo && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs font-medium text-blue-800 mb-1">Parking Info</p>
                      <p>{job.address.parkingInfo}</p>
                    </div>
                  )}

                  {job.address.petInfo && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                      <p className="text-xs font-medium text-purple-800 mb-1">Pet Info</p>
                      <p>{job.address.petInfo}</p>
                    </div>
                  )}

                  {job.notes && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                      <p className="text-xs font-medium text-gray-800 mb-1">Notes</p>
                      <p>{job.notes}</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Jobs */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Upcoming Jobs</h2>
        {upcomingJobs.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No upcoming jobs scheduled
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingJobs.map((job) => (
              <Card key={job.id} className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{job.client.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(job.scheduledDate)} at {formatTime(job.scheduledDate)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{job.address.street}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{job.serviceType}</p>
                    <p className="text-xs text-gray-500">{job.duration} min</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
