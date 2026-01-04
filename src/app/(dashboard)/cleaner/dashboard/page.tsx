'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Clock, MapPin, Phone, CheckCircle } from 'lucide-react';

interface Job {
  id: string;
  scheduledDate: string;
  duration: number;
  serviceType: string;
  status: string;
  price: number;
  notes: string | null;
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

  const handleMarkComplete = async (jobId: string) => {
    if (!confirm('Mark this job as completed?')) return;

    try {
      const res = await fetch(`/api/cleaner/jobs/${jobId}/complete`, {
        method: 'POST',
      });

      if (res.ok) {
        alert('Job marked as completed!');
        fetchJobs(); // Refresh the list
      } else {
        alert('Failed to mark job as completed');
      }
    } catch (error) {
      console.error('Failed to complete job:', error);
      alert('Failed to mark job as completed');
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
                  <div>
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
                  {job.status === 'SCHEDULED' && (
                    <Button onClick={() => handleMarkComplete(job.id)} size="sm">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                  {job.status === 'COMPLETED' && (
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                      Completed
                    </span>
                  )}
                </div>

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
