'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'operational' | 'degraded' | 'down' | 'checking';
  responseTime?: number;
  description: string;
}

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Database',
      url: '/api/clients',
      status: 'checking',
      description: 'PostgreSQL database connection'
    },
    {
      name: 'Authentication',
      url: '/api/auth/session',
      status: 'checking',
      description: 'NextAuth session management'
    },
    {
      name: 'Booking API',
      url: '/api/bookings',
      status: 'checking',
      description: 'Job and booking management'
    },
    {
      name: 'Team API',
      url: '/api/team/members',
      status: 'checking',
      description: 'Team member management'
    },
    {
      name: 'Invoice API',
      url: '/api/invoices',
      status: 'checking',
      description: 'Invoice and payment processing'
    },
  ]);

  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkServiceStatus = async (service: ServiceStatus): Promise<ServiceStatus> => {
    const startTime = Date.now();
    try {
      const response = await fetch(service.url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const responseTime = Date.now() - startTime;

      if (response.ok || response.status === 401) {
        // 401 is OK for protected routes - means API is working
        return {
          ...service,
          status: responseTime < 1000 ? 'operational' : 'degraded',
          responseTime
        };
      } else {
        return { ...service, status: 'down', responseTime };
      }
    } catch (error) {
      return { ...service, status: 'down', responseTime: Date.now() - startTime };
    }
  };

  const checkAllServices = async () => {
    const results = await Promise.all(
      services.map(service => checkServiceStatus(service))
    );
    setServices(results);
    setLastChecked(new Date());
  };

  useEffect(() => {
    checkAllServices();
    // Check every 30 seconds
    const interval = setInterval(checkAllServices, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'degraded':
        return <Clock className="h-6 w-6 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'checking':
        return <Clock className="h-6 w-6 text-gray-400 animate-pulse" />;
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800';
      case 'down':
        return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
      case 'checking':
        return 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800';
    }
  };

  const getStatusText = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded':
        return 'Degraded Performance';
      case 'down':
        return 'Down';
      case 'checking':
        return 'Checking...';
    }
  };

  const allOperational = services.every(s => s.status === 'operational');
  const anyDown = services.some(s => s.status === 'down');

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">System Status</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time status of CleanDay CRM services
        </p>
      </div>

      {/* Overall Status Banner */}
      <Card className={`p-6 ${anyDown ? 'bg-red-50 border-red-300' : allOperational ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
        <div className="flex items-center gap-4">
          <div className="text-5xl">
            {anyDown ? '🔴' : allOperational ? '🟢' : '🟡'}
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {anyDown ? 'Some Services Are Down' : allOperational ? 'All Systems Operational' : 'Degraded Performance'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : 'Checking services...'}
            </p>
          </div>
          <Button onClick={checkAllServices} variant="outline" className="ml-auto">
            Refresh Status
          </Button>
        </div>
      </Card>

      {/* Service Status List */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold">Services</h2>
        {services.map((service) => (
          <Card key={service.name} className={`p-4 ${getStatusColor(service.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                {getStatusIcon(service.status)}
                <div className="flex-1">
                  <h3 className="font-bold">{service.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{service.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{getStatusText(service.status)}</div>
                {service.responseTime !== undefined && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {service.responseTime}ms
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Available Routes */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Available Routes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Public Routes */}
          <div>
            <h3 className="font-bold text-sm text-gray-600 dark:text-gray-400 mb-2">PUBLIC ROUTES</h3>
            <div className="space-y-1 text-sm">
              <a href="/" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                / - Homepage
              </a>
              <a href="/login" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /login - Login
              </a>
              <a href="/signup" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /signup - Sign Up
              </a>
              <a href="/forgot-password" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /forgot-password - Password Reset
              </a>
              <div className="text-gray-500 dark:text-gray-500">
                /estimate/[token] - Public Estimate View
              </div>
              <div className="text-gray-500 dark:text-gray-500">
                /feedback/[token] - Post-Service Feedback
              </div>
              <div className="text-gray-500 dark:text-gray-500">
                /pay-copay/[token] - Copay Payment
              </div>
            </div>
          </div>

          {/* Dashboard Routes */}
          <div>
            <h3 className="font-bold text-sm text-gray-600 dark:text-gray-400 mb-2">DASHBOARD (ADMIN/OWNER)</h3>
            <div className="space-y-1 text-sm">
              <a href="/dashboard" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /dashboard - Main Dashboard
              </a>
              <a href="/clients" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /clients - Client List
              </a>
              <a href="/clients/new" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /clients/new - New Client
              </a>
              <a href="/jobs" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /jobs - Job List
              </a>
              <a href="/jobs/new" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /jobs/new - New Job
              </a>
              <a href="/calendar" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /calendar - Calendar View
              </a>
              <a href="/team" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /team - Team Management
              </a>
              <a href="/estimates" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /estimates - Estimates
              </a>
              <a href="/invoices" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /invoices - Invoices
              </a>
              <a href="/settings" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /settings - Settings
              </a>
              <a href="/feed" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /feed - Activity Feed
              </a>
              <a href="/debug" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /debug - Debug Info
              </a>
              <a href="/status" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /status - System Status
              </a>
            </div>
          </div>

          {/* Cleaner Portal */}
          <div>
            <h3 className="font-bold text-sm text-gray-600 dark:text-gray-400 mb-2">CLEANER PORTAL</h3>
            <div className="space-y-1 text-sm">
              <a href="/cleaner/dashboard" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /cleaner/dashboard - Cleaner Dashboard
              </a>
            </div>
          </div>

          {/* Customer Portal */}
          <div>
            <h3 className="font-bold text-sm text-gray-600 dark:text-gray-400 mb-2">CUSTOMER PORTAL</h3>
            <div className="space-y-1 text-sm">
              <a href="/customer/dashboard" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /customer/dashboard - Customer Dashboard
              </a>
              <a href="/customer/bookings" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /customer/bookings - My Bookings
              </a>
              <a href="/customer/invoices" className="block hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                /customer/invoices - My Invoices
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* System Info */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-600 dark:text-gray-400">Application</div>
            <div className="font-bold">CleanDay CRM</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Version</div>
            <div className="font-bold">0.1.0</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Environment</div>
            <div className="font-bold">Production</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Framework</div>
            <div className="font-bold">Next.js 14.2.0</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Database</div>
            <div className="font-bold">PostgreSQL (Neon)</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Hosting</div>
            <div className="font-bold">Vercel</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
