'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Save, Plus, X } from 'lucide-react';

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function CleanerSchedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<TimeSlot[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchAvailability();
    }
  }, [status, router]);

  const fetchAvailability = async () => {
    try {
      const res = await fetch('/api/cleaner/availability');
      if (res.ok) {
        const data = await res.json();
        if (data.availability && data.availability.length > 0) {
          setAvailability(data.availability);
        } else {
          // Initialize with default schedule (Mon-Fri 9AM-5PM)
          setAvailability(
            DAYS_OF_WEEK.map((day) => ({
              day,
              startTime: day === 'Saturday' || day === 'Sunday' ? '10:00' : '09:00',
              endTime: day === 'Saturday' || day === 'Sunday' ? '14:00' : '17:00',
              available: day !== 'Saturday' && day !== 'Sunday',
            }))
          );
        }
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
      // Initialize with default schedule on error
      setAvailability(
        DAYS_OF_WEEK.map((day) => ({
          day,
          startTime: '09:00',
          endTime: '17:00',
          available: day !== 'Saturday' && day !== 'Sunday',
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (day: string) => {
    setAvailability((prev) =>
      prev.map((slot) =>
        slot.day === day ? { ...slot, available: !slot.available } : slot
      )
    );
  };

  const handleTimeChange = (
    day: string,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setAvailability((prev) =>
      prev.map((slot) =>
        slot.day === day ? { ...slot, [field]: value } : slot
      )
    );
  };

  const handleSaveAvailability = async () => {
    setSaving(true);

    try {
      const res = await fetch('/api/cleaner/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability }),
      });

      if (res.ok) {
        alert('Availability saved successfully!');
      } else {
        alert('Failed to save availability');
      }
    } catch (error) {
      console.error('Failed to save availability:', error);
      alert('Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyToAll = (sourceDay: string) => {
    const sourceSlot = availability.find((slot) => slot.day === sourceDay);
    if (!sourceSlot) return;

    if (confirm(`Copy ${sourceDay}'s hours to all other days?`)) {
      setAvailability((prev) =>
        prev.map((slot) =>
          slot.day === sourceDay
            ? slot
            : {
                ...slot,
                startTime: sourceSlot.startTime,
                endTime: sourceSlot.endTime,
                available: sourceSlot.available,
              }
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Schedule & Availability</h1>
          <p className="text-gray-600">
            Set your working hours for each day of the week
          </p>
        </div>
        <Button onClick={handleSaveAvailability} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Quick Actions */}
      <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            <span className="text-sm font-medium">Quick Actions:</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAvailability((prev) =>
                  prev.map((slot) => ({
                    ...slot,
                    available: true,
                  }))
                );
              }}
            >
              Enable All Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAvailability((prev) =>
                  prev.map((slot) => ({
                    ...slot,
                    available: false,
                  }))
                );
              }}
            >
              Disable All Days
            </Button>
          </div>
        </div>
      </Card>

      {/* Weekly Schedule */}
      <div className="space-y-4">
        {availability.map((slot) => (
          <Card
            key={slot.day}
            className={`p-6 ${
              !slot.available ? 'bg-gray-50 opacity-60' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              {/* Day Toggle */}
              <div className="flex items-center gap-4 w-1/4">
                <input
                  type="checkbox"
                  checked={slot.available}
                  onChange={() => handleToggleDay(slot.day)}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <div>
                  <h3 className="font-semibold text-lg">{slot.day}</h3>
                  {!slot.available && (
                    <span className="text-xs text-gray-500">Unavailable</span>
                  )}
                </div>
              </div>

              {/* Time Inputs */}
              {slot.available && (
                <div className="flex items-center gap-4 flex-1 justify-center">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) =>
                        handleTimeChange(slot.day, 'startTime', e.target.value)
                      }
                      className="border rounded px-3 py-2"
                    />
                  </div>
                  <span className="text-gray-400 mt-5">to</span>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) =>
                        handleTimeChange(slot.day, 'endTime', e.target.value)
                      }
                      className="border rounded px-3 py-2"
                    />
                  </div>
                </div>
              )}

              {/* Copy Action */}
              {slot.available && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyToAll(slot.day)}
                  className="ml-4"
                >
                  Copy to All
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Help Text */}
      <Card className="p-4 mt-6 bg-yellow-50 border-yellow-200">
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> Your availability helps the office schedule jobs
          during your working hours. If you need time off or have special
          scheduling needs, please contact your office administrator.
        </p>
      </Card>

      {/* Summary */}
      <Card className="p-6 mt-6">
        <h3 className="font-semibold mb-4">Weekly Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {availability.filter((s) => s.available).length}
            </div>
            <div className="text-sm text-gray-600">Days Available</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {availability
                .filter((s) => s.available)
                .reduce((total, slot) => {
                  const start = new Date(`2000-01-01T${slot.startTime}`);
                  const end = new Date(`2000-01-01T${slot.endTime}`);
                  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                  return total + hours;
                }, 0)
                .toFixed(0)}
            </div>
            <div className="text-sm text-gray-600">Hours/Week</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {(() => {
                const availableSlots = availability.filter((s) => s.available);
                if (availableSlots.length === 0) return 'N/A';
                return availableSlots[0].startTime;
              })()}
            </div>
            <div className="text-sm text-gray-600">Typical Start</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {(() => {
                const availableSlots = availability.filter((s) => s.available);
                if (availableSlots.length === 0) return 'N/A';
                return availableSlots[0].endTime;
              })()}
            </div>
            <div className="text-sm text-gray-600">Typical End</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
