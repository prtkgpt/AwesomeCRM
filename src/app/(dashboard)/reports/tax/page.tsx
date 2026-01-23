'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Clock,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Download,
  AlertTriangle,
  CheckCircle,
  User,
  Calendar,
  TrendingUp,
  Building,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';

interface QuarterlyBreakdown {
  quarter: string;
  earnings: number;
  tips: number;
  reimbursements: number;
  total: number;
  jobs: number;
  hours: number;
}

interface CleanerTaxSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  employeeId: string | null;
  hireDate: string | null;
  hourlyRate: number;
  address: {
    street: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  grossIncome: number;
  wages: number;
  tips: number;
  reimbursements: number;
  totalCompensation: number;
  totalJobs: number;
  totalHours: number;
  avgHourlyEarnings: number;
  quarterly: QuarterlyBreakdown[];
}

interface TaxSummaryData {
  year: number;
  availableYears: number[];
  company: {
    name: string;
    address: string | null;
    phone: string | null;
  };
  totals: {
    totalCleaners: number;
    cleanersWithIncome: number;
    totalGrossIncome: number;
    totalWages: number;
    totalTips: number;
    totalReimbursements: number;
    totalJobs: number;
    totalHours: number;
  };
  cleaners: CleanerTaxSummary[];
  threshold: {
    amount: number;
    note: string;
  };
}

export default function TaxReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData] = useState<TaxSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [expandedCleaners, setExpandedCleaners] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Check role
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'OWNER') {
      router.push('/dashboard');
      return;
    }

    fetchTaxSummary();
  }, [status, selectedYear]);

  const fetchTaxSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/tax-summary?year=${selectedYear}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load tax summary');
      }
    } catch (err) {
      setError('Failed to load tax summary');
    } finally {
      setLoading(false);
    }
  };

  const toggleCleanerExpanded = (cleanerId: string) => {
    setExpandedCleaners((prev) => {
      const next = new Set(prev);
      if (next.has(cleanerId)) {
        next.delete(cleanerId);
      } else {
        next.add(cleanerId);
      }
      return next;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return `${hours.toLocaleString()} hrs`;
  };

  const exportToCSV = () => {
    if (!data) return;

    setExporting(true);

    try {
      // Headers
      const headers = [
        'Name',
        'Email',
        'Phone',
        'Employee ID',
        'Hire Date',
        'Hourly Rate',
        'Street',
        'City',
        'State',
        'ZIP',
        'Total Jobs',
        'Total Hours',
        'Wages',
        'Tips',
        'Gross Income (1099-NEC Box 1)',
        'Reimbursements',
        'Total Compensation',
        'Q1 Total',
        'Q2 Total',
        'Q3 Total',
        'Q4 Total',
      ];

      // Data rows
      const rows = data.cleaners.map((c) => [
        c.name,
        c.email,
        c.phone || '',
        c.employeeId || '',
        c.hireDate ? new Date(c.hireDate).toLocaleDateString() : '',
        c.hourlyRate.toFixed(2),
        c.address.street || '',
        c.address.city || '',
        c.address.state || '',
        c.address.zip || '',
        c.totalJobs.toString(),
        c.totalHours.toFixed(2),
        c.wages.toFixed(2),
        c.tips.toFixed(2),
        c.grossIncome.toFixed(2),
        c.reimbursements.toFixed(2),
        c.totalCompensation.toFixed(2),
        c.quarterly[0]?.total.toFixed(2) || '0.00',
        c.quarterly[1]?.total.toFixed(2) || '0.00',
        c.quarterly[2]?.total.toFixed(2) || '0.00',
        c.quarterly[3]?.total.toFixed(2) || '0.00',
      ]);

      // Create CSV content
      const csvContent = [
        `"1099-NEC Tax Report - ${data.year}"`,
        `"Company: ${data.company.name}"`,
        `"Generated: ${new Date().toLocaleDateString()}"`,
        '',
        headers.map((h) => `"${h}"`).join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        '',
        `"Total Cleaners",${data.totals.totalCleaners}`,
        `"Cleaners Requiring 1099",${data.cleaners.filter((c) => c.grossIncome >= 600).length}`,
        `"Total Gross Income",${data.totals.totalGrossIncome.toFixed(2)}`,
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `1099-tax-report-${data.year}.csv`;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const requires1099 = (grossIncome: number) => grossIncome >= 600;

  if (status === 'loading') {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reports">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              1099 Tax Reports
            </h1>
            <p className="text-sm text-gray-500">
              Contractor compensation summary for tax filing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectedYear.toString()}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="w-32"
          >
            {data?.availableYears?.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            )) || (
              <option value={new Date().getFullYear()}>
                {new Date().getFullYear()}
              </option>
            )}
          </Select>

          <Button variant="outline" onClick={fetchTaxSummary} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button onClick={exportToCSV} disabled={exporting || !data}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-700">{error}</p>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-gray-500">
          <RefreshCw className="h-8 w-8 mx-auto animate-spin mb-4" />
          <p>Loading tax summary...</p>
        </div>
      )}

      {/* Data Display */}
      {!loading && data && (
        <>
          {/* Company Info & Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Building className="h-4 w-4" />
                <span className="text-sm">Company</span>
              </div>
              <div className="font-semibold">{data.company.name}</div>
              <div className="text-sm text-gray-500">Tax Year {data.year}</div>
            </Card>

            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Total Gross Income</span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(data.totals.totalGrossIncome)}
              </div>
              <div className="text-sm text-green-600">
                Wages + Tips (1099-NEC reportable)
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Briefcase className="h-4 w-4" />
                <span className="text-sm">Total Jobs</span>
              </div>
              <div className="text-2xl font-bold">{data.totals.totalJobs.toLocaleString()}</div>
              <div className="text-sm text-gray-500">
                {formatHours(data.totals.totalHours)} worked
              </div>
            </Card>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <User className="h-4 w-4" />
                <span className="text-sm">1099 Required</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {data.cleaners.filter((c) => requires1099(c.grossIncome)).length}
              </div>
              <div className="text-sm text-blue-600">
                of {data.totals.totalCleaners} cleaners
              </div>
            </Card>
          </div>

          {/* 1099 Threshold Notice */}
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">IRS 1099-NEC Requirement</p>
                <p className="text-sm text-amber-700 mt-1">
                  {data.threshold.note}. Cleaners marked with{' '}
                  <span className="inline-flex items-center gap-1 bg-amber-200 px-1.5 py-0.5 rounded text-xs font-medium">
                    <AlertTriangle className="h-3 w-3" /> 1099
                  </span>{' '}
                  require a 1099-NEC form.
                </p>
              </div>
            </div>
          </Card>

          {/* Breakdown Summary */}
          <Card className="p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Compensation Breakdown
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Wages</div>
                <div className="text-lg font-bold">{formatCurrency(data.totals.totalWages)}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Tips</div>
                <div className="text-lg font-bold">{formatCurrency(data.totals.totalTips)}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Reimbursements</div>
                <div className="text-lg font-bold">{formatCurrency(data.totals.totalReimbursements)}</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm text-green-700">Gross Income</div>
                <div className="text-lg font-bold text-green-700">
                  {formatCurrency(data.totals.totalGrossIncome)}
                </div>
              </div>
            </div>
          </Card>

          {/* Cleaner List */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Cleaner Tax Summaries ({data.cleaners.length})
            </h2>

            {data.cleaners.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No cleaners found with completed jobs in {data.year}</p>
              </Card>
            ) : (
              data.cleaners.map((cleaner) => {
                const isExpanded = expandedCleaners.has(cleaner.id);
                const needs1099 = requires1099(cleaner.grossIncome);

                return (
                  <Card key={cleaner.id} className={`overflow-hidden ${needs1099 ? 'border-amber-300' : ''}`}>
                    {/* Header Row */}
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleCleanerExpanded(cleaner.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-gray-100 rounded-full">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{cleaner.name}</span>
                              {needs1099 && (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-medium">
                                  <AlertTriangle className="h-3 w-3" />
                                  1099 Required
                                </span>
                              )}
                              {!needs1099 && cleaner.grossIncome > 0 && (
                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                                  <CheckCircle className="h-3 w-3" />
                                  Under Threshold
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {cleaner.email} {cleaner.phone && `| ${cleaner.phone}`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Gross Income</div>
                            <div className={`text-lg font-bold ${needs1099 ? 'text-amber-700' : ''}`}>
                              {formatCurrency(cleaner.grossIncome)}
                            </div>
                          </div>
                          <div className="text-right hidden md:block">
                            <div className="text-sm text-gray-500">Jobs</div>
                            <div className="font-semibold">{cleaner.totalJobs}</div>
                          </div>
                          <div className="text-right hidden md:block">
                            <div className="text-sm text-gray-500">Hours</div>
                            <div className="font-semibold">{cleaner.totalHours}</div>
                          </div>
                          <Button variant="ghost" size="sm">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4 space-y-4">
                        {/* Personal Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 uppercase mb-1">Employee ID</div>
                            <div className="font-medium">{cleaner.employeeId || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase mb-1">Hire Date</div>
                            <div className="font-medium">
                              {cleaner.hireDate
                                ? new Date(cleaner.hireDate).toLocaleDateString()
                                : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase mb-1">Hourly Rate</div>
                            <div className="font-medium">{formatCurrency(cleaner.hourlyRate)}/hr</div>
                          </div>
                        </div>

                        {/* Address */}
                        {(cleaner.address.street || cleaner.address.city) && (
                          <div>
                            <div className="text-xs text-gray-500 uppercase mb-1">Address</div>
                            <div className="font-medium">
                              {[
                                cleaner.address.street,
                                cleaner.address.city,
                                cleaner.address.state,
                                cleaner.address.zip,
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            </div>
                          </div>
                        )}

                        {/* Earnings Breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-xs text-gray-500">Wages</div>
                            <div className="font-bold">{formatCurrency(cleaner.wages)}</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-xs text-gray-500">Tips</div>
                            <div className="font-bold">{formatCurrency(cleaner.tips)}</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-xs text-gray-500">Reimbursements</div>
                            <div className="font-bold">{formatCurrency(cleaner.reimbursements)}</div>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <div className="text-xs text-green-700">Gross Income</div>
                            <div className="font-bold text-green-700">{formatCurrency(cleaner.grossIncome)}</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-xs text-gray-500">Avg/Hour</div>
                            <div className="font-bold">{formatCurrency(cleaner.avgHourlyEarnings)}</div>
                          </div>
                        </div>

                        {/* Quarterly Breakdown */}
                        <div>
                          <div className="text-xs text-gray-500 uppercase mb-2">Quarterly Breakdown</div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-white">
                                  <th className="text-left p-2 font-medium">Quarter</th>
                                  <th className="text-right p-2 font-medium">Jobs</th>
                                  <th className="text-right p-2 font-medium">Hours</th>
                                  <th className="text-right p-2 font-medium">Wages</th>
                                  <th className="text-right p-2 font-medium">Tips</th>
                                  <th className="text-right p-2 font-medium">Reimb.</th>
                                  <th className="text-right p-2 font-medium">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cleaner.quarterly.map((q) => (
                                  <tr key={q.quarter} className="border-t">
                                    <td className="p-2 font-medium">{q.quarter}</td>
                                    <td className="p-2 text-right">{q.jobs}</td>
                                    <td className="p-2 text-right">{q.hours}</td>
                                    <td className="p-2 text-right">{formatCurrency(q.earnings)}</td>
                                    <td className="p-2 text-right">{formatCurrency(q.tips)}</td>
                                    <td className="p-2 text-right">{formatCurrency(q.reimbursements)}</td>
                                    <td className="p-2 text-right font-medium">{formatCurrency(q.total)}</td>
                                  </tr>
                                ))}
                                <tr className="border-t-2 bg-gray-100 font-bold">
                                  <td className="p-2">Total</td>
                                  <td className="p-2 text-right">{cleaner.totalJobs}</td>
                                  <td className="p-2 text-right">{cleaner.totalHours}</td>
                                  <td className="p-2 text-right">{formatCurrency(cleaner.wages)}</td>
                                  <td className="p-2 text-right">{formatCurrency(cleaner.tips)}</td>
                                  <td className="p-2 text-right">{formatCurrency(cleaner.reimbursements)}</td>
                                  <td className="p-2 text-right">{formatCurrency(cleaner.totalCompensation)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* 1099 Note */}
                        {needs1099 && (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
                            <strong>1099-NEC Required:</strong> This contractor earned{' '}
                            {formatCurrency(cleaner.grossIncome)} which exceeds the $600 IRS threshold.
                            You must issue a 1099-NEC form by January 31st of the following year.
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {/* Footer Notes */}
          <Card className="p-4 bg-gray-50">
            <h3 className="font-semibold mb-2">Important Tax Notes</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                <strong>1099-NEC Box 1:</strong> Report the "Gross Income" amount (Wages + Tips) for each contractor
              </li>
              <li>
                <strong>Reimbursements:</strong> Generally not reported on 1099-NEC if they are accountable plan reimbursements
              </li>
              <li>
                <strong>Filing Deadline:</strong> 1099-NEC forms must be filed with the IRS and provided to contractors by January 31st
              </li>
              <li>
                <strong>Contractor vs Employee:</strong> Ensure your workers are properly classified as independent contractors
              </li>
            </ul>
            <p className="text-xs text-gray-500 mt-3">
              This report is for informational purposes only. Please consult with a tax professional for official tax filing guidance.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
