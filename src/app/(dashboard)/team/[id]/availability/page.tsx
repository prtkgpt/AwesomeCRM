'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type DaySchedule = {
  available: boolean;
  start: string;
  end: string;
};

type RecurringSchedule = {
  sunday: DaySchedule;
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
};

type DateOverride = {
  available: boolean;
  start?: string;
  end?: string;
  reason?: string;
  note?: string;
};

type AvailabilityData = {
  recurring: RecurringSchedule;
  overrides: Record<string, DateOverride>;
};

export default function ManageAvailabilityPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamMember, setTeamMember] = useState<any>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);

  const [mode, setMode] = useState<'default' | 'specific' | 'timeoff'>('default');
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchAvailability();
  }, [memberId]);

  const fetchAvailability = async () => {
    try {
      const response = await fetch(`/api/team/members/${memberId}/availability`);
      const data = await response.json();

      if (data.success) {
        setTeamMember(data.data.teamMember);
        setAvailability(data.data.availability);
      } else {
        alert('Failed to load availability');
        router.back();
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
      alert('Failed to load availability');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecurring = async () => {
    if (!availability) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/team/members/${memberId}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Availability updated successfully!');
      } else {
        alert(data.error || 'Failed to update availability');
      }
    } catch (error) {
      console.error('Failed to update availability:', error);
      alert('Failed to update availability');
    } finally {
      setSaving(false);
    }
  };

  const updateDaySchedule = (day: keyof RecurringSchedule, field: keyof DaySchedule, value: any) => {
    if (!availability) return;

    setAvailability({
      ...availability,
      recurring: {
        ...availability.recurring,
        [day]: {
          ...availability.recurring[day],
          [field]: value,
        },
      },
    });
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const addDateOverride = (date: Date, override: DateOverride) => {
    if (!availability) return;

    const dateKey = formatDateKey(date);
    setAvailability({
      ...availability,
      overrides: {
        ...availability.overrides,
        [dateKey]: override,
      },
    });
  };

  const removeDateOverride = (date: Date) => {
    if (!availability) return;

    const dateKey = formatDateKey(date);
    const { [dateKey]: removed, ...rest } = availability.overrides;
    setAvailability({
      ...availability,
      overrides: rest,
    });
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const previousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const nextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const getDayScheduleForDate = (date: Date) => {
    if (!availability) return null;

    const dateKey = formatDateKey(date);
    if (availability.overrides[dateKey]) {
      return availability.overrides[dateKey];
    }

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof RecurringSchedule;
    return availability.recurring[dayName];
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Loading availability...</div>
      </div>
    );
  }

  if (!availability || !teamMember) {
    return null;
  }

  const days: Array<keyof RecurringSchedule> = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/team/${memberId}/edit`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Team Member
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Manage Availability
        </h1>
      </div>

      {/* Team Member Info */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {teamMember.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{teamMember.email}</p>
          </div>
        </div>
      </Card>

      {/* Mode Selector */}
      <Card className="p-4 mb-6">
        <button
          onClick={() => setMode(mode === 'default' ? 'default' : 'default')}
          className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900 dark:text-white">Change Availability</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </button>

        {mode && (
          <div className="mt-2 space-y-2 pl-4">
            <button
              onClick={() => setMode('default')}
              className={`block w-full text-left px-4 py-2 rounded ${
                mode === 'default'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Default Availability
            </button>
            <button
              onClick={() => setMode('specific')}
              className={`block w-full text-left px-4 py-2 rounded ${
                mode === 'specific'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Specific Date
            </button>
            <button
              onClick={() => setMode('timeoff')}
              className={`block w-full text-left px-4 py-2 rounded ${
                mode === 'timeoff'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Request Time Off
            </button>
          </div>
        )}
      </Card>

      {/* Default Availability Mode */}
      {mode === 'default' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Weekly Schedule
          </h3>

          <div className="space-y-4">
            {days.map((day) => {
              const schedule = availability.recurring[day];
              const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);

              return (
                <div key={day} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-32">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={schedule.available}
                        onChange={(e) => updateDaySchedule(day, 'available', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {dayLabel}
                      </span>
                    </label>
                  </div>

                  {schedule.available && (
                    <div className="flex items-center gap-2 flex-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        value={schedule.start}
                        onChange={(e) => updateDaySchedule(day, 'start', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={schedule.end}
                        onChange={(e) => updateDaySchedule(day, 'end', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}

                  {!schedule.available && (
                    <div className="flex-1 text-sm text-gray-500">
                      Not available
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveRecurring} disabled={saving}>
              {saving ? 'Saving...' : 'Save Schedule'}
            </Button>
          </div>
        </Card>
      )}

      {/* Specific Date Mode */}
      {mode === 'specific' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Override Specific Date
          </h3>

          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={previousDay}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextDay}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium"
              >
                Today
              </button>
            </div>

            <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h4>

            <Calendar className="w-6 h-6 text-gray-400" />
          </div>

          {/* Date Override Form */}
          <SpecificDateForm
            date={selectedDate}
            currentSchedule={getDayScheduleForDate(selectedDate)}
            onSave={(override) => {
              addDateOverride(selectedDate, override);
              handleSaveRecurring();
            }}
            onRemove={() => {
              removeDateOverride(selectedDate);
              handleSaveRecurring();
            }}
          />
        </Card>
      )}

      {/* Time Off Mode */}
      {mode === 'timeoff' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Request Time Off
          </h3>

          <TimeOffForm
            onSubmit={(startDate, endDate, reason) => {
              const current = new Date(startDate);
              const end = new Date(endDate);

              while (current <= end) {
                addDateOverride(new Date(current), {
                  available: false,
                  reason,
                });
                current.setDate(current.getDate() + 1);
              }

              handleSaveRecurring();
            }}
          />
        </Card>
      )}

      {/* Legend */}
      <div className="mt-6 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Schedule</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Time Off</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Note</span>
        </div>
      </div>
    </div>
  );
}

// Specific Date Override Form Component
function SpecificDateForm({
  date,
  currentSchedule,
  onSave,
  onRemove,
}: {
  date: Date;
  currentSchedule: any;
  onSave: (override: DateOverride) => void;
  onRemove: () => void;
}) {
  const [available, setAvailable] = useState(currentSchedule?.available ?? true);
  const [startTime, setStartTime] = useState(currentSchedule?.start ?? '09:00');
  const [endTime, setEndTime] = useState(currentSchedule?.end ?? '18:00');
  const [note, setNote] = useState(currentSchedule?.note ?? '');

  const hasOverride = currentSchedule && 'note' in currentSchedule;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => setAvailable(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label className="font-medium text-gray-900 dark:text-white">Available on this date</label>
      </div>

      {available && (
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          placeholder="e.g., Half day, Doctor appointment"
        />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() =>
            onSave({
              available,
              start: available ? startTime : undefined,
              end: available ? endTime : undefined,
              note: note || undefined,
            })
          }
        >
          Save Override
        </Button>
        {hasOverride && (
          <Button variant="outline" onClick={onRemove}>
            Remove Override
          </Button>
        )}
      </div>
    </div>
  );
}

// Time Off Request Form Component
function TimeOffForm({
  onSubmit,
}: {
  onSubmit: (startDate: string, endDate: string, reason: string) => void;
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }
    onSubmit(startDate, endDate, reason);
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Reason
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          placeholder="e.g., Vacation, Sick leave, Personal day"
          required
        />
      </div>

      <Button type="submit">Request Time Off</Button>
    </form>
  );
}
