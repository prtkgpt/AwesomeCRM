'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Calendar,
  PieChart as PieChartIcon,
  BarChart3,
  Download,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface FinancialData {
  overview: {
    totalRevenue: number;
    paidRevenue: number;
    unpaidRevenue: number;
    totalWages: number;
    grossProfit: number;
    profitMargin: string;
    totalBookings: number;
    avgBookingValue: number;
    avgCustomerLifetimeValue: number;
  };
  serviceTypeAnalytics: Array<{
    serviceType: string;
    revenue: number;
    count: number;
    averagePrice: number;
    wages: number;
    profit: number;
    profitMargin: number;
  }>;
  paymentMethods: Array<{
    method: string;
    revenue: number;
  }>;
  topCustomers: Array<{
    clientId: string;
    clientName: string;
    revenue: number;
    bookings: number;
  }>;
  customerSegmentation: {
    newCustomerRevenue: number;
    returningCustomerRevenue: number;
    newCustomerCount: number;
    returningCustomerCount: number;
    newCustomerPercent: number;
    returningCustomerPercent: number;
  };
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    wages: number;
    profit: number;
    bookings: number;
  }>;
  outstandingInvoices: {
    count: number;
    amount: number;
  };
  period: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function FinancialDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchFinancialData();
    }
  }, [status, period, router]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/financial?period=${period}`);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      } else {
        if (res.status === 403) {
          alert('Access denied. Owner/Admin access required.');
          router.push('/dashboard');
        }
      }
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading financial data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="text-center text-red-600">Failed to load financial data</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Financial Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Advanced analytics and financial insights
          </p>
        </div>
        <div className="flex gap-3">
          {/* Period Filter */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          >
            <option value="all">All Time</option>
            <option value="year">This Year</option>
            <option value="quarter">This Quarter</option>
            <option value="month">This Month</option>
          </select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {formatCurrency(data.overview.totalRevenue)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {data.overview.totalBookings} bookings
          </p>
        </Card>

        {/* Gross Profit */}
        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full">
              {data.overview.profitMargin}%
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Gross Profit</p>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {formatCurrency(data.overview.grossProfit)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {data.overview.profitMargin}% margin
          </p>
        </Card>

        {/* Average Booking Value */}
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg Booking Value</p>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {formatCurrency(data.overview.avgBookingValue)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            per booking
          </p>
        </Card>

        {/* Outstanding Invoices */}
        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-500 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            {data.overview.unpaidRevenue > 0 && (
              <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding</p>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
            {formatCurrency(data.outstandingInvoices.amount)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {data.outstandingInvoices.count} invoices
          </p>
        </Card>
      </div>

      {/* Revenue Trends Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Revenue Trends (Last 12 Months)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.monthlyTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
            <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
            <Line type="monotone" dataKey="wages" stroke="#f59e0b" strokeWidth={2} name="Wages" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Type Performance */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Service Type Performance
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.serviceTypeAnalytics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="serviceType" />
              <YAxis />
              <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''} />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
              <Bar dataKey="profit" fill="#10b981" name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Payment Methods */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-indigo-600" />
            Payment Methods
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.paymentMethods}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.method}: ${((entry.revenue / data.overview.paidRevenue) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="revenue"
              >
                {data.paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Customers */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-orange-600" />
          Top 10 Customers by Revenue
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-3 text-sm font-semibold">Rank</th>
                <th className="text-left p-3 text-sm font-semibold">Customer</th>
                <th className="text-right p-3 text-sm font-semibold">Revenue</th>
                <th className="text-right p-3 text-sm font-semibold">Bookings</th>
                <th className="text-right p-3 text-sm font-semibold">Avg/Booking</th>
              </tr>
            </thead>
            <tbody>
              {data.topCustomers.map((customer, index) => (
                <tr key={customer.clientId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-900' :
                      index === 2 ? 'bg-orange-400 text-orange-900' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{customer.clientName}</td>
                  <td className="p-3 text-right font-semibold text-green-600">
                    {formatCurrency(customer.revenue)}
                  </td>
                  <td className="p-3 text-right">{customer.bookings}</td>
                  <td className="p-3 text-right text-gray-600 dark:text-gray-400">
                    {formatCurrency(customer.revenue / customer.bookings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
