'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Clock,
  MapPin,
  Navigation,
  Car,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Phone,
  ExternalLink,
  Route,
  Timer,
  CheckCircle2,
  Circle,
  AlertCircle,
  Thermometer,
  Wind,
  Droplets,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/utils';

interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  gateCode: string | null;
  parkingInfo: string | null;
  petInfo: string | null;
}

interface Job {
  id: string;
  scheduledDate: string;
  duration: number;
  serviceType: string;
  status: string;
  wage: number;
  hourlyRate: number;
  notes: string | null;
  onMyWaySentAt: string | null;
  clockedInAt: string | null;
  clockedOutAt: string | null;
  stopNumber: number;
  distanceFromPrevious: number | null;
  driveTimeFromPrevious: number | null;
  client: {
    name: string;
    phone: string | null;
  };
  address: Address;
}

interface RouteStats {
  totalJobs: number;
  totalDistance: number;
  totalDriveTime: number;
  totalJobTime: number;
  estimatedFinishTime: string | null;
}

interface WeatherData {
  temp: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  description: string;
  humidity: number;
  windSpeed: number;
  high: number;
  low: number;
}

export default function CleanerTodayPage() {
  const { status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchTodayRoute();
      fetchWeather();
    }
  }, [status, router]);

  const fetchTodayRoute = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cleaner/today');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setRouteStats(data.routeStats || null);
      } else {
        setError('Failed to load today\'s schedule');
      }
    } catch (err) {
      console.error('Failed to fetch today\'s route:', err);
      setError('Failed to load today\'s schedule');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async () => {
    // Simulate weather data - in production, use a real weather API
    // Based on typical conditions for demo purposes
    const conditions: WeatherData[] = [
      { temp: 72, condition: 'sunny', description: 'Clear skies', humidity: 45, windSpeed: 8, high: 78, low: 62 },
      { temp: 68, condition: 'cloudy', description: 'Partly cloudy', humidity: 55, windSpeed: 12, high: 72, low: 58 },
      { temp: 58, condition: 'rainy', description: 'Light rain expected', humidity: 80, windSpeed: 15, high: 62, low: 52 },
    ];
    // Deterministic based on day of month
    const index = new Date().getDate() % conditions.length;
    setWeather(conditions[index]);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getGoogleMapsUrl = (address: Address) => {
    const query = encodeURIComponent(`${address.street}, ${address.city}, ${address.state} ${address.zip}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  };

  const getAppleMapsUrl = (address: Address) => {
    const query = encodeURIComponent(`${address.street}, ${address.city}, ${address.state} ${address.zip}`);
    return `https://maps.apple.com/?daddr=${query}`;
  };

  const getJobStatus = (job: Job) => {
    if (job.status === 'COMPLETED' || job.status === 'CLEANER_COMPLETED') return 'completed';
    if (job.clockedInAt && !job.clockedOutAt) return 'in_progress';
    if (job.onMyWaySentAt) return 'en_route';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'in_progress': return 'text-blue-600 dark:text-blue-400';
      case 'en_route': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-gray-400 dark:text-gray-500';
    }
  };

  const WeatherIcon = ({ condition }: { condition: string }) => {
    switch (condition) {
      case 'sunny': return <Sun className="h-8 w-8 text-yellow-500" />;
      case 'cloudy': return <Cloud className="h-8 w-8 text-gray-400" />;
      case 'rainy': return <CloudRain className="h-8 w-8 text-blue-500" />;
      case 'snowy': return <Snowflake className="h-8 w-8 text-cyan-400" />;
      default: return <Sun className="h-8 w-8 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96 mb-6" />
        <Skeleton className="h-32 w-full mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
          <Route className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          Today's Route
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm flex items-center gap-2 border-2 border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Weather Card */}
      {weather && (
        <Card className="p-4 md:p-6 mb-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <WeatherIcon condition={weather.condition} />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{weather.temp}°F</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{weather.description}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Thermometer className="h-4 w-4" />
                    H: {weather.high}° L: {weather.low}°
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden md:flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Droplets className="h-4 w-4" />
                {weather.humidity}% humidity
              </span>
              <span className="flex items-center gap-1">
                <Wind className="h-4 w-4" />
                {weather.windSpeed} mph
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Route Summary */}
      {routeStats && routeStats.totalJobs > 0 && (
        <Card className="p-4 md:p-6 mb-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Timer className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Route Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white/60 dark:bg-gray-900/30 rounded-lg">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{routeStats.totalJobs}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Jobs</p>
            </div>
            <div className="text-center p-3 bg-white/60 dark:bg-gray-900/30 rounded-lg">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{routeStats.totalDistance} mi</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Distance</p>
            </div>
            <div className="text-center p-3 bg-white/60 dark:bg-gray-900/30 rounded-lg">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{routeStats.totalDriveTime} min</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Drive Time</p>
            </div>
            <div className="text-center p-3 bg-white/60 dark:bg-gray-900/30 rounded-lg">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatDuration(routeStats.totalJobTime)}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Work Time</p>
            </div>
          </div>
          {routeStats.estimatedFinishTime && (
            <div className="mt-4 p-3 bg-white/60 dark:bg-gray-900/30 rounded-lg text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Estimated finish time: <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatTime(routeStats.estimatedFinishTime)}</span>
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Jobs Timeline */}
      {jobs.length === 0 ? (
        <Card className="p-8 md:p-12 text-center text-gray-500">
          <div className="text-5xl mb-4">🌴</div>
          <p className="text-xl font-medium">No jobs scheduled for today</p>
          <p className="text-sm mt-2">Enjoy your day off!</p>
        </Card>
      ) : (
        <div className="space-y-0">
          {jobs.map((job, index) => {
            const jobStatus = getJobStatus(job);
            const isLast = index === jobs.length - 1;

            return (
              <div key={job.id}>
                {/* Drive Time Between Jobs */}
                {job.driveTimeFromPrevious && job.driveTimeFromPrevious > 0 && (
                  <div className="flex items-center gap-3 py-3 ml-6 border-l-2 border-dashed border-gray-300 dark:border-gray-600 pl-6">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
                      <Car className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{job.driveTimeFromPrevious} min drive</span>
                      <span className="text-gray-500">({job.distanceFromPrevious} mi)</span>
                    </div>
                  </div>
                )}

                {/* Job Card */}
                <Card className={`p-4 md:p-6 ${!isLast ? 'rounded-b-none border-b-0' : ''}`}>
                  <div className="flex gap-4">
                    {/* Stop Number & Timeline */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        jobStatus === 'completed' ? 'bg-green-500' :
                        jobStatus === 'in_progress' ? 'bg-blue-500' :
                        jobStatus === 'en_route' ? 'bg-orange-500' :
                        'bg-gray-400 dark:bg-gray-600'
                      }`}>
                        {jobStatus === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          job.stopNumber
                        )}
                      </div>
                      {!isLast && (
                        <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-2" />
                      )}
                    </div>

                    {/* Job Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-3">
                        <div>
                          <h3 className="text-lg font-semibold">{job.client.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatTime(job.scheduledDate)}
                            </span>
                            <span>•</span>
                            <span>{formatDuration(job.duration)}</span>
                            <span>•</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">{job.serviceType}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {jobStatus === 'completed' && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                              Completed
                            </span>
                          )}
                          {jobStatus === 'in_progress' && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 animate-pulse">
                              In Progress
                            </span>
                          )}
                          {jobStatus === 'en_route' && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200">
                              En Route
                            </span>
                          )}
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            ${job.wage.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="flex items-start gap-2 mb-3 text-sm">
                        <MapPin className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium">{job.address.street}</p>
                          <p className="text-gray-600 dark:text-gray-400">
                            {job.address.city}, {job.address.state} {job.address.zip}
                          </p>
                        </div>
                      </div>

                      {/* Quick Info Badges */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {job.address.gateCode && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded border border-yellow-200 dark:border-yellow-800">
                            Gate: {job.address.gateCode}
                          </span>
                        )}
                        {job.address.parkingInfo && (
                          <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded border border-blue-200 dark:border-blue-800">
                            Parking info available
                          </span>
                        )}
                        {job.address.petInfo && (
                          <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded border border-purple-200 dark:border-purple-800">
                            Pet info
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {/* Navigate Button - Primary CTA */}
                        <a
                          href={getGoogleMapsUrl(job.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 md:flex-none"
                        >
                          <Button
                            size="sm"
                            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            Navigate
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </a>

                        {/* Apple Maps */}
                        <a
                          href={getAppleMapsUrl(job.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hidden md:block"
                        >
                          <Button size="sm" variant="outline">
                            Apple Maps
                          </Button>
                        </a>

                        {/* Call Client */}
                        {job.client.phone && (
                          <a href={`tel:${job.client.phone}`}>
                            <Button size="sm" variant="outline">
                              <Phone className="h-4 w-4 mr-2" />
                              Call
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Connector to next job */}
                {!isLast && !jobs[index + 1]?.driveTimeFromPrevious && (
                  <div className="h-4 ml-6 border-l-2 border-gray-200 dark:border-gray-700" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Stats */}
      {jobs.length > 0 && (
        <Card className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-2">
              <Circle className={`h-3 w-3 ${getStatusColor('pending')}`} />
              Pending
            </span>
            <span className="flex items-center gap-2">
              <Circle className={`h-3 w-3 ${getStatusColor('en_route')}`} />
              En Route
            </span>
            <span className="flex items-center gap-2">
              <Circle className={`h-3 w-3 ${getStatusColor('in_progress')}`} />
              In Progress
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className={`h-3 w-3 ${getStatusColor('completed')}`} />
              Completed
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
