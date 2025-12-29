'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import type { ClientWithAddresses } from '@/types';

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithAddresses[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchClients();
  }, [search]);

  const fetchClients = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`/api/clients?${params}`);
      const data = await response.json();

      if (data.success) {
        setClients(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (clients.length === 0) {
      alert('No clients to export');
      return;
    }

    // CSV headers
    const headers = ['Name', 'Email', 'Phone', 'Tags', 'Street', 'City', 'State', 'ZIP', 'Notes'];

    // CSV rows
    const rows = clients.map(client => {
      const primaryAddress = client.addresses.find(a => a.isDefault) || client.addresses[0];
      return [
        client.name,
        client.email || '',
        client.phone || '',
        client.tags.join('; '),
        primaryAddress?.street || '',
        primaryAddress?.city || '',
        primaryAddress?.state || '',
        primaryAddress?.zip || '',
        client.notes || ''
      ].map(field => `"${field}"`); // Wrap in quotes for CSV safety
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `cleandaycrm-clients-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Clients</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base mt-1">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'} in your database
          </p>
        </div>
        <div className="flex gap-2 md:gap-3">
          {clients.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportToCSV} className="md:size-default">
              <Download className="h-4 w-4 mr-1 md:mr-2" />
              Export CSV
            </Button>
          )}
          <Link href="/clients/new">
            <Button size="sm" className="md:size-default">
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              New Client
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">No clients yet</p>
          <Link href="/clients/new">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Client
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="p-4 md:p-5 hover:shadow-lg transition-shadow h-full">
                <div className="flex flex-col h-full">
                  <h3 className="font-semibold text-lg md:text-xl mb-2 hover:text-blue-600 dark:hover:text-blue-400">
                    {client.name}
                  </h3>

                  <div className="space-y-1 mb-3">
                    {client.email && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{client.email}</p>
                    )}
                    {client.phone && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{client.phone}</p>
                    )}
                    {client.addresses.length > 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        {client.addresses[0].city}, {client.addresses[0].state}
                      </p>
                    )}
                  </div>

                  {client.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
                      {client.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
