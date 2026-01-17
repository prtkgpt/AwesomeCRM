'use client';

import { useState, useEffect } from 'react';
import { Plus, Calendar, Repeat, Clock, MapPin, User, MoreVertical, Pause, Play, Trash2, Edit, ChevronRight } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, ConfirmDialog } from '@/components/ui/dialog';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { format, addDays, addWeeks, addMonths } from 'date-fns';

interface RecurringBooking {
  id: string;
  client: { id: string; firstName: string; lastName: string };
  serviceType: string;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  customIntervalDays?: number;
  preferredDay: string;
  preferredTime: string;
  duration: number;
  address: string;
  assignedCleaner?: { id: string; firstName: string; lastName: string };
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  nextOccurrence: string;
  totalOccurrences: number;
  price: number;
  notes?: string;
  createdAt: string;
}

const frequencyLabels = {
  WEEKLY: 'Every week',
  BIWEEKLY: 'Every 2 weeks',
  MONTHLY: 'Every month',
  CUSTOM: 'Custom',
};

const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i % 12 || 12;
  const ampm = i < 12 ? 'AM' : 'PM';
  return `${hour}:00 ${ampm}`;
});

export default function RecurringBookingsPage() {
  const [bookings, setBookings] = useState<RecurringBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<RecurringBooking | null>(null);

  const [formData, setFormData] = useState({
    clientId: '',
    serviceType: 'STANDARD',
    frequency: 'WEEKLY' as RecurringBooking['frequency'],
    customIntervalDays: 7,
    preferredDay: 'Monday',
    preferredTime: '9:00 AM',
    duration: 120,
    address: '',
    assignedCleanerId: '',
    price: 150,
    notes: '',
    startDate: new Date(),
  });

  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [cleaners, setCleaners] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchRecurringBookings();
    fetchClients();
    fetchCleaners();
  }, []);

  const fetchRecurringBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings/recurring');
      const data = await res.json();
      if (data.success) {
        setBookings(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients?limit=100');
      const data = await res.json();
      if (data.success) {
        setClients(data.data.map((c: any) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })));
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchCleaners = async () => {
    try {
      const res = await fetch('/api/team?role=CLEANER');
      const data = await res.json();
      if (data.success) {
        setCleaners(data.data.map((c: any) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })));
      }
    } catch (error) {
      console.error('Failed to fetch cleaners:', error);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/bookings/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowCreateDialog(false);
        fetchRecurringBookings();
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create:', error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedBooking) return;
    try {
      const res = await fetch(`/api/bookings/recurring?id=${selectedBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowEditDialog(false);
        fetchRecurringBookings();
      }
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  const handlePause = async () => {
    if (!selectedBooking) return;
    try {
      const res = await fetch(`/api/bookings/recurring?id=${selectedBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedBooking.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED' }),
      });
      if (res.ok) {
        setShowPauseDialog(false);
        fetchRecurringBookings();
      }
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  const handleCancel = async () => {
    if (!selectedBooking) return;
    try {
      const res = await fetch(`/api/bookings/recurring?id=${selectedBooking.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setShowCancelDialog(false);
        fetchRecurringBookings();
      }
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      serviceType: 'STANDARD',
      frequency: 'WEEKLY',
      customIntervalDays: 7,
      preferredDay: 'Monday',
      preferredTime: '9:00 AM',
      duration: 120,
      address: '',
      assignedCleanerId: '',
      price: 150,
      notes: '',
      startDate: new Date(),
    });
  };

  const openEditDialog = (booking: RecurringBooking) => {
    setSelectedBooking(booking);
    setFormData({
      clientId: booking.client.id,
      serviceType: booking.serviceType,
      frequency: booking.frequency,
      customIntervalDays: booking.customIntervalDays || 7,
      preferredDay: booking.preferredDay,
      preferredTime: booking.preferredTime,
      duration: booking.duration,
      address: booking.address,
      assignedCleanerId: booking.assignedCleaner?.id || '',
      price: booking.price,
      notes: booking.notes || '',
      startDate: new Date(booking.nextOccurrence),
    });
    setShowEditDialog(true);
  };

  const columns: Column<RecurringBooking>[] = [
    {
      key: 'client',
      header: 'Client',
      render: (b) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {b.client.firstName} {b.client.lastName}
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {b.address.split(',')[0]}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (b) => (
        <div>
          <p className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-white">
            <Repeat className="w-4 h-4 text-blue-500" />
            {frequencyLabels[b.frequency]}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {b.preferredDay}s at {b.preferredTime}
          </p>
        </div>
      ),
    },
    {
      key: 'next',
      header: 'Next Occurrence',
      sortable: true,
      render: (b) => (
        <div>
          <p className="text-sm text-gray-900 dark:text-white">
            {format(new Date(b.nextOccurrence), 'MMM d, yyyy')}
          </p>
          <p className="text-xs text-gray-500">
            {b.totalOccurrences} completed
          </p>
        </div>
      ),
    },
    {
      key: 'cleaner',
      header: 'Assigned To',
      render: (b) => (
        b.assignedCleaner ? (
          <span className="text-sm text-gray-900 dark:text-white">
            {b.assignedCleaner.firstName} {b.assignedCleaner.lastName}
          </span>
        ) : (
          <span className="text-sm text-gray-400">Unassigned</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => (
        <StatusBadge
          status={b.status === 'ACTIVE' ? 'active' : b.status === 'PAUSED' ? 'pending' : 'cancelled'}
          label={b.status}
        />
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (b) => (
        <span className="font-medium text-gray-900 dark:text-white">
          ${b.price}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (b) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEditDialog(b); }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); setShowPauseDialog(true); }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title={b.status === 'PAUSED' ? 'Resume' : 'Pause'}
          >
            {b.status === 'PAUSED' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); setShowCancelDialog(true); }}
            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded"
            title="Cancel"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const stats = {
    active: bookings.filter(b => b.status === 'ACTIVE').length,
    paused: bookings.filter(b => b.status === 'PAUSED').length,
    monthlyRevenue: bookings
      .filter(b => b.status === 'ACTIVE')
      .reduce((sum, b) => {
        const multiplier = b.frequency === 'WEEKLY' ? 4 : b.frequency === 'BIWEEKLY' ? 2 : 1;
        return sum + b.price * multiplier;
      }, 0),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recurring Bookings</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage recurring cleaning schedules</p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Recurring
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500">Active Schedules</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500">Paused</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.paused}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500">Est. Monthly Revenue</p>
          <p className="text-2xl font-bold text-green-600">${stats.monthlyRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={bookings}
        columns={columns}
        keyField="id"
        searchable
        searchPlaceholder="Search recurring bookings..."
        loading={loading}
        emptyMessage="No recurring bookings found"
      />

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onClose={() => { setShowCreateDialog(false); setShowEditDialog(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{showEditDialog ? 'Edit Recurring Booking' : 'Create Recurring Booking'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              >
                <option value="">Select client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service Type</label>
                <select
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                >
                  <option value="STANDARD">Standard</option>
                  <option value="DEEP">Deep Clean</option>
                  <option value="MOVE_IN_OUT">Move In/Out</option>
                  <option value="OFFICE">Office</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as RecurringBooking['frequency'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Bi-weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
            </div>

            {formData.frequency === 'CUSTOM' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Repeat every (days)</label>
                <input
                  type="number"
                  value={formData.customIntervalDays}
                  onChange={(e) => setFormData({ ...formData, customIntervalDays: parseInt(e.target.value) })}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferred Day</label>
                <select
                  value={formData.preferredDay}
                  onChange={(e) => setFormData({ ...formData, preferredDay: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                >
                  {dayOptions.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferred Time</label>
                <select
                  value={formData.preferredTime}
                  onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter service address"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  min={30}
                  step={30}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ($)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  min={0}
                  step={5}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Cleaner</label>
              <select
                value={formData.assignedCleanerId}
                onChange={(e) => setFormData({ ...formData, assignedCleanerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              >
                <option value="">Auto-assign</option>
                {cleaners.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Special instructions or notes"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => { setShowCreateDialog(false); setShowEditDialog(false); resetForm(); }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={showEditDialog ? handleUpdate : handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {showEditDialog ? 'Update' : 'Create'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Dialog */}
      <ConfirmDialog
        open={showPauseDialog}
        onClose={() => setShowPauseDialog(false)}
        onConfirm={handlePause}
        title={selectedBooking?.status === 'PAUSED' ? 'Resume Schedule' : 'Pause Schedule'}
        description={selectedBooking?.status === 'PAUSED'
          ? 'Resume this recurring booking? Future occurrences will be scheduled automatically.'
          : 'Pause this recurring booking? No new occurrences will be scheduled until resumed.'
        }
        confirmText={selectedBooking?.status === 'PAUSED' ? 'Resume' : 'Pause'}
        variant={selectedBooking?.status === 'PAUSED' ? 'default' : 'warning'}
      />

      {/* Cancel Dialog */}
      <ConfirmDialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancel}
        title="Cancel Recurring Booking"
        description="Are you sure you want to cancel this recurring booking? This action cannot be undone."
        confirmText="Cancel Booking"
        variant="danger"
      />
    </div>
  );
}
