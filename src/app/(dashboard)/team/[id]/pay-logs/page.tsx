'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Plus, DollarSign, Receipt, Fuel, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface PayLog {
  id: string;
  type: 'PAYCHECK' | 'SUPPLIES_REIMBURSEMENT' | 'GAS_REIMBURSEMENT';
  amount: number;
  date: string;
  description?: string;
  notes?: string;
  hoursWorked?: number;
  hourlyRate?: number;
  periodStart?: string;
  periodEnd?: string;
  receiptUrl?: string;
  createdAt: string;
}

interface TeamMember {
  id: string;
  user: {
    name: string | null;
    email: string;
  };
  hourlyRate: number | null;
}

export default function PayLogsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [payLogs, setPayLogs] = useState<PayLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Permission check: Only OWNER can access pay logs
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if ((session?.user as any)?.role !== 'OWNER') {
      alert('Access denied. Only the owner can view pay logs.');
      router.push('/team');
      return;
    }
  }, [status, session, router]);

  const [formData, setFormData] = useState({
    type: 'PAYCHECK' as 'PAYCHECK' | 'SUPPLIES_REIMBURSEMENT' | 'GAS_REIMBURSEMENT',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
    hoursWorked: '',
    hourlyRate: '',
    periodStart: '',
    periodEnd: '',
    receiptUrl: '',
  });

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch team member details
      const memberRes = await fetch(`/api/team/members/${params.id}`);
      if (memberRes.ok) {
        const memberData = await memberRes.json();
        setTeamMember(memberData.data);

        // Set default hourly rate if available
        if (memberData.data?.hourlyRate) {
          setFormData(prev => ({
            ...prev,
            hourlyRate: memberData.data.hourlyRate.toString(),
          }));
        }
      }

      // Fetch pay logs
      const logsRes = await fetch(`/api/team/${params.id}/pay-logs`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setPayLogs(logsData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load pay logs');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-calculate amount for paycheck based on hours and rate
    if (formData.type === 'PAYCHECK' && (name === 'hoursWorked' || name === 'hourlyRate')) {
      const hours = name === 'hoursWorked' ? parseFloat(value) : parseFloat(formData.hoursWorked);
      const rate = name === 'hourlyRate' ? parseFloat(value) : parseFloat(formData.hourlyRate);

      if (!isNaN(hours) && !isNaN(rate)) {
        setFormData(prev => ({ ...prev, amount: (hours * rate).toFixed(2) }));
      }
    }
  };

  const handleTypeChange = (type: 'PAYCHECK' | 'SUPPLIES_REIMBURSEMENT' | 'GAS_REIMBURSEMENT') => {
    setFormData({
      type,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      notes: '',
      hoursWorked: type === 'PAYCHECK' ? formData.hoursWorked : '',
      hourlyRate: type === 'PAYCHECK' ? (teamMember?.hourlyRate?.toString() || formData.hourlyRate) : '',
      periodStart: type === 'PAYCHECK' ? formData.periodStart : '',
      periodEnd: type === 'PAYCHECK' ? formData.periodEnd : '',
      receiptUrl: type !== 'PAYCHECK' ? formData.receiptUrl : '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload: any = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        date: formData.date,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
      };

      if (formData.type === 'PAYCHECK') {
        payload.hoursWorked = formData.hoursWorked ? parseFloat(formData.hoursWorked) : undefined;
        payload.hourlyRate = formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined;
        payload.periodStart = formData.periodStart || undefined;
        payload.periodEnd = formData.periodEnd || undefined;
      } else {
        payload.receiptUrl = formData.receiptUrl || undefined;
      }

      const response = await fetch(`/api/team/${params.id}/pay-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setShowAddForm(false);
        fetchData(); // Refresh the list
        // Reset form
        setFormData({
          type: 'PAYCHECK',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
          notes: '',
          hoursWorked: '',
          hourlyRate: teamMember?.hourlyRate?.toString() || '',
          periodStart: '',
          periodEnd: '',
          receiptUrl: '',
        });
      } else {
        setError(data.error || 'Failed to create pay log');
      }
    } catch (err: any) {
      console.error('Create pay log error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLogs = filterType === 'ALL'
    ? payLogs
    : payLogs.filter(log => log.type === filterType);

  const calculateSummary = () => {
    const paychecks = payLogs.filter(l => l.type === 'PAYCHECK').reduce((sum, l) => sum + l.amount, 0);
    const supplies = payLogs.filter(l => l.type === 'SUPPLIES_REIMBURSEMENT').reduce((sum, l) => sum + l.amount, 0);
    const gas = payLogs.filter(l => l.type === 'GAS_REIMBURSEMENT').reduce((sum, l) => sum + l.amount, 0);

    return {
      paychecks,
      supplies,
      gas,
      total: paychecks + supplies + gas,
    };
  };

  const summary = calculateSummary();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PAYCHECK':
        return <DollarSign className="h-4 w-4" />;
      case 'SUPPLIES_REIMBURSEMENT':
        return <Receipt className="h-4 w-4" />;
      case 'GAS_REIMBURSEMENT':
        return <Fuel className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PAYCHECK':
        return 'Paycheck';
      case 'SUPPLIES_REIMBURSEMENT':
        return 'Supplies Reimbursement';
      case 'GAS_REIMBURSEMENT':
        return 'Gas Reimbursement';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PAYCHECK':
        return 'bg-green-100 text-green-800';
      case 'SUPPLIES_REIMBURSEMENT':
        return 'bg-blue-100 text-blue-800';
      case 'GAS_REIMBURSEMENT':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading pay logs...</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/team')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Pay Logs</h1>
            <p className="text-sm text-gray-600">
              {teamMember?.user.name || teamMember?.user.email}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {showAddForm ? 'Cancel' : 'Add Pay Log'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <DollarSign className="h-4 w-4" />
            <span>Total Paychecks</span>
          </div>
          <p className="text-2xl font-bold text-green-600">${summary.paychecks.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Receipt className="h-4 w-4" />
            <span>Supplies Reimbursed</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">${summary.supplies.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Fuel className="h-4 w-4" />
            <span>Gas Reimbursed</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">${summary.gas.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Download className="h-4 w-4" />
            <span>Total Paid</span>
          </div>
          <p className="text-2xl font-bold">${summary.total.toFixed(2)}</p>
        </Card>
      </div>

      {/* Add Pay Log Form */}
      {showAddForm && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Add Pay Log Entry</h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selection */}
            <div>
              <Label htmlFor="type">Type *</Label>
              <Select
                id="type"
                name="type"
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value as any)}
                required
              >
                <option value="PAYCHECK">Paycheck</option>
                <option value="SUPPLIES_REIMBURSEMENT">Supplies Reimbursement</option>
                <option value="GAS_REIMBURSEMENT">Gas Reimbursement</option>
              </Select>
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            {/* Paycheck-specific fields */}
            {formData.type === 'PAYCHECK' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hoursWorked">Hours Worked</Label>
                    <Input
                      id="hoursWorked"
                      name="hoursWorked"
                      type="number"
                      step="0.01"
                      value={formData.hoursWorked}
                      onChange={handleChange}
                      placeholder="40"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                    <Input
                      id="hourlyRate"
                      name="hourlyRate"
                      type="number"
                      step="0.01"
                      value={formData.hourlyRate}
                      onChange={handleChange}
                      placeholder="25.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="periodStart">Pay Period Start</Label>
                    <Input
                      id="periodStart"
                      name="periodStart"
                      type="date"
                      value={formData.periodStart}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="periodEnd">Pay Period End</Label>
                    <Input
                      id="periodEnd"
                      name="periodEnd"
                      type="date"
                      value={formData.periodEnd}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Reimbursement-specific fields */}
            {(formData.type === 'SUPPLIES_REIMBURSEMENT' || formData.type === 'GAS_REIMBURSEMENT') && (
              <div>
                <Label htmlFor="receiptUrl">Receipt URL (Optional)</Label>
                <Input
                  id="receiptUrl"
                  name="receiptUrl"
                  type="url"
                  value={formData.receiptUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Link to receipt image or document
                </p>
              </div>
            )}

            {/* Amount */}
            <div>
              <Label htmlFor="amount">Amount ($) *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={handleChange}
                required
                placeholder="100.00"
              />
              {formData.type === 'PAYCHECK' && formData.hoursWorked && formData.hourlyRate && (
                <p className="text-xs text-gray-500 mt-1">
                  Auto-calculated from hours × rate
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={
                  formData.type === 'PAYCHECK'
                    ? 'Regular biweekly paycheck'
                    : formData.type === 'SUPPLIES_REIMBURSEMENT'
                    ? 'Cleaning supplies from Home Depot'
                    : 'Gas for company vehicle'
                }
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (Internal)</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Adding...' : 'Add Pay Log'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label>Filter by Type:</Label>
        <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="ALL">All Types</option>
          <option value="PAYCHECK">Paychecks</option>
          <option value="SUPPLIES_REIMBURSEMENT">Supplies Reimbursement</option>
          <option value="GAS_REIMBURSEMENT">Gas Reimbursement</option>
        </Select>
        <span className="text-sm text-gray-600">
          {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Pay Logs List */}
      <Card>
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Pay Log History</h2>
        </div>
        <div className="divide-y">
          {filteredLogs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No pay logs found. Add your first entry above.
            </div>
          ) : (
            filteredLogs
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((log) => (
                <div key={log.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getTypeColor(log.type)}`}>
                          {getTypeIcon(log.type)}
                          {getTypeLabel(log.type)}
                        </span>
                        <span className="text-sm text-gray-600">
                          {new Date(log.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      {log.description && (
                        <p className="text-sm font-medium mb-1">{log.description}</p>
                      )}

                      <div className="text-sm text-gray-600 space-y-1">
                        {log.type === 'PAYCHECK' && (
                          <>
                            {log.hoursWorked && log.hourlyRate && (
                              <p>
                                {log.hoursWorked} hours × ${log.hourlyRate}/hr
                              </p>
                            )}
                            {log.periodStart && log.periodEnd && (
                              <p>
                                Pay Period: {new Date(log.periodStart).toLocaleDateString()} -{' '}
                                {new Date(log.periodEnd).toLocaleDateString()}
                              </p>
                            )}
                          </>
                        )}

                        {log.receiptUrl && (
                          <p>
                            <a
                              href={log.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View Receipt →
                            </a>
                          </p>
                        )}

                        {log.notes && (
                          <p className="text-gray-500 italic">Note: {log.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold">${log.amount.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Added {new Date(log.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </Card>
    </div>
  );
}
