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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        <div className="flex gap-2">
          {clients.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          )}
          <Link href="/clients/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Client
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No clients yet</p>
          <Link href="/clients/new">
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Add Your First Client
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{client.name}</h3>
                    {client.email && (
                      <p className="text-sm text-gray-600">{client.email}</p>
                    )}
                    {client.phone && (
                      <p className="text-sm text-gray-600">{client.phone}</p>
                    )}
                    {client.addresses.length > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        {client.addresses[0].city}, {client.addresses[0].state}
                      </p>
                    )}
                  </div>
                  {client.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {client.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full"
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
