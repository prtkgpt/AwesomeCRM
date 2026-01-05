'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Bell,
  CheckCircle,
  Clock,
  CreditCard,
  AlertCircle,
  Send,
  Calendar,
  User,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'action' | 'activity';
  category: 'cleaning_starting' | 'cleaning_completed' | 'payment_charged' | 'reminder_needed' | 'booking_created' | 'estimate_sent';
  title: string;
  description: string;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
  metadata?: {
    clientName?: string;
    cleanerName?: string;
    amount?: number;
    jobId?: string;
    estimateId?: string;
  };
}

export default function FeedPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'action' | 'activity'>('all');

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/feed');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (category: string) => {
    switch (category) {
      case 'cleaning_starting':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'cleaning_completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'payment_charged':
        return <CreditCard className="h-5 w-5 text-blue-500" />;
      case 'reminder_needed':
        return <Bell className="h-5 w-5 text-yellow-500" />;
      case 'booking_created':
        return <Calendar className="h-5 w-5 text-purple-500" />;
      case 'estimate_sent':
        return <Send className="h-5 w-5 text-cyan-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'medium':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
      case 'low':
        return 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
      default:
        return 'border-l-4 border-l-gray-300';
    }
  };

  const filteredActivities = activities.filter((activity) => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  const actionItems = activities.filter((a) => a.type === 'action');
  const recentActivities = activities.filter((a) => a.type === 'activity');

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Activity Feed</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base mt-1">
            Stay updated with action items and recent activities
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchActivities}
          className="self-start md:self-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Action Items</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {actionItems.length}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Recent Activities</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {recentActivities.length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">High Priority</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {activities.filter((a) => a.priority === 'high').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <Bell className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'action' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('action')}
        >
          Action Items ({actionItems.length})
        </Button>
        <Button
          variant={filter === 'activity' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('activity')}
        >
          Recent Activity ({recentActivities.length})
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading activities...</div>
      ) : filteredActivities.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            All caught up!
          </h3>
          <p className="text-sm text-gray-500">
            No {filter === 'action' ? 'action items' : filter === 'activity' ? 'recent activities' : 'activities'} at the moment
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((activity) => (
            <Card
              key={activity.id}
              className={`p-4 hover:shadow-md transition-shadow ${getPriorityColor(activity.priority)}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  {getActivityIcon(activity.category)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{activity.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {activity.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                      {activity.type === 'action' && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                            Action Required
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {activity.metadata && (
                    <div className="flex flex-wrap gap-4 mt-3 text-sm">
                      {activity.metadata.clientName && (
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <User className="h-4 w-4" />
                          <span>{activity.metadata.clientName}</span>
                        </div>
                      )}
                      {activity.metadata.cleanerName && (
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <User className="h-4 w-4" />
                          <span>{activity.metadata.cleanerName}</span>
                        </div>
                      )}
                      {activity.metadata.amount !== undefined && (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                          <DollarSign className="h-4 w-4" />
                          <span>${activity.metadata.amount.toFixed(2)}</span>
                        </div>
                      )}
                      {activity.metadata.jobId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto py-1 px-2 text-xs"
                          onClick={() => window.location.href = `/jobs/${activity.metadata?.jobId}`}
                        >
                          View Job
                        </Button>
                      )}
                      {activity.metadata.estimateId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto py-1 px-2 text-xs"
                          onClick={() => window.location.href = `/estimates`}
                        >
                          View Estimate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
