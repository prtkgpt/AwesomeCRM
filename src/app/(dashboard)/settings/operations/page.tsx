'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

export default function OperationalExpensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [expenses, setExpenses] = useState({
    insuranceCost: 0,
    bondCost: 0,
    workersCompCost: 0,
    cleaningSuppliesCost: 0,
    gasReimbursementRate: 0,
    vaAdminSalary: 0,
    ownerSalary: 0,
    otherExpenses: 0,
  });

  useEffect(() => {
    if (status === 'authenticated') {
      // Check if user is owner
      const userRole = (session?.user as any)?.role;
      if (userRole !== 'OWNER') {
        router.push('/settings');
        return;
      }
      fetchExpenses();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, session, router]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/company/operations');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setExpenses({
            insuranceCost: data.data.insuranceCost || 0,
            bondCost: data.data.bondCost || 0,
            workersCompCost: data.data.workersCompCost || 0,
            cleaningSuppliesCost: data.data.cleaningSuppliesCost || 0,
            gasReimbursementRate: data.data.gasReimbursementRate || 0,
            vaAdminSalary: data.data.vaAdminSalary || 0,
            ownerSalary: data.data.ownerSalary || 0,
            otherExpenses: data.data.otherExpenses || 0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/company/operations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenses),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Operational expenses saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save expenses' });
      }
    } catch (error) {
      console.error('Failed to save expenses:', error);
      setMessage({ type: 'error', text: 'Failed to save expenses' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof expenses, value: string) => {
    const numValue = parseFloat(value) || 0;
    setExpenses((prev) => ({ ...prev, [field]: numValue }));
  };

  const totalMonthlyExpenses =
    expenses.insuranceCost +
    expenses.bondCost +
    expenses.workersCompCost +
    expenses.cleaningSuppliesCost +
    expenses.vaAdminSalary +
    expenses.ownerSalary +
    expenses.otherExpenses;

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Operational Expenses</h1>
        <p className="text-gray-600">
          Configure your monthly business expenses for accurate profit tracking (Owner Only)
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <DollarSign className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          Monthly Fixed Expenses
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Insurance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Insurance (Monthly)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                value={expenses.insuranceCost}
                onChange={(e) => handleInputChange('insuranceCost', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Business liability insurance</p>
          </div>

          {/* Bond */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bond (Monthly)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                value={expenses.bondCost}
                onChange={(e) => handleInputChange('bondCost', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Surety bond cost</p>
          </div>

          {/* Workers Compensation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workers Compensation (Monthly)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                value={expenses.workersCompCost}
                onChange={(e) => handleInputChange('workersCompCost', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Workers comp insurance</p>
          </div>

          {/* Cleaning Supplies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cleaning Supplies (Monthly)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                value={expenses.cleaningSuppliesCost}
                onChange={(e) => handleInputChange('cleaningSuppliesCost', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Equipment & supplies</p>
          </div>

          {/* VA/Admin Salary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VA/Admin Salary (Monthly)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                value={expenses.vaAdminSalary}
                onChange={(e) => handleInputChange('vaAdminSalary', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Administrative staff salary</p>
          </div>

          {/* Owner Salary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Owner Salary (Monthly)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                value={expenses.ownerSalary}
                onChange={(e) => handleInputChange('ownerSalary', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Owner compensation</p>
          </div>

          {/* Gas Reimbursement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gas Reimbursement Rate
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                value={expenses.gasReimbursementRate}
                onChange={(e) => handleInputChange('gasReimbursementRate', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Per mile or per job</p>
          </div>

          {/* Other Expenses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Other Expenses (Monthly)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                value={expenses.otherExpenses}
                onChange={(e) => handleInputChange('otherExpenses', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Miscellaneous costs</p>
          </div>
        </div>
      </Card>

      {/* Summary Card */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Monthly Operational Expenses
            </h3>
            <p className="text-xs text-gray-600">
              Excludes gas reimbursement (calculated per job)
            </p>
          </div>
          <div className="text-3xl font-bold text-blue-700">
            ${totalMonthlyExpenses.toFixed(2)}
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/settings')}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Expenses'}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="p-4 mt-6 bg-yellow-50 border-yellow-200">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">How this affects profit calculations:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>These expenses are used for financial reporting and profit analysis</li>
              <li>Monthly expenses are distributed across all jobs in that month</li>
              <li>Gas reimbursement is calculated per job based on distance or fixed rate</li>
              <li>Only owners can see the full profit breakdown</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
