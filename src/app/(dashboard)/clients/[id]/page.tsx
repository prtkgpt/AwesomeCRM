'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    async function loadClient() {
      try {
        console.log('Fetching client:', clientId);
        const res = await fetch(`/api/clients/${clientId}`);
        const data = await res.json();
        console.log('Client response:', data);

        if (data.success) {
          setClient(data.data);
        } else {
          setError(data.error || 'Failed to load client');
          setErrorDetails(data.details || null);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Network error');
        setErrorDetails(err instanceof Error ? err.message : 'Unknown network error');
      } finally {
        setLoading(false);
      }
    }

    if (clientId) {
      loadClient();
    }
  }, [clientId]);

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading client {clientId}...</p>
      </div>
    );
  }

  if (error) {
    const handleDebug = async () => {
      try {
        const res = await fetch(`/api/test-client/${clientId}`);
        const data = await res.json();
        alert(JSON.stringify(data, null, 2));
      } catch (err) {
        alert('Debug request failed: ' + (err instanceof Error ? err.message : 'Unknown'));
      }
    };

    return (
      <div className="p-8">
        <Card className="p-6">
          <h1 className="text-xl font-bold text-red-600 mb-4">Error Loading Client</h1>
          <p className="mb-4 font-medium">{error}</p>
          {errorDetails && (
            <div className="mb-4 p-3 bg-red-50 rounded border border-red-200">
              <p className="text-sm text-red-700 font-mono">{errorDetails}</p>
            </div>
          )}
          <p className="text-sm text-gray-500 mb-4">Client ID: {clientId}</p>
          <div className="flex gap-2">
            <Link href="/clients">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
            </Link>
            <Button variant="outline" onClick={handleDebug}>
              Run Debug
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/clients">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <h1 className="text-3xl font-bold mb-4">{client?.name || 'Unknown'}</h1>

        <div className="space-y-2">
          <p><strong>ID:</strong> {client?.id}</p>
          <p><strong>Email:</strong> {client?.email || 'N/A'}</p>
          <p><strong>Phone:</strong> {client?.phone || 'N/A'}</p>
          <p><strong>Insurance:</strong> {client?.hasInsurance ? 'Yes' : 'No'}</p>

          {client?.addresses?.length > 0 && (
            <div className="mt-4">
              <strong>Address:</strong>
              <p>{client.addresses[0].street}</p>
              <p>{client.addresses[0].city}, {client.addresses[0].state} {client.addresses[0].zip}</p>
            </div>
          )}

          {client?.notes && (
            <div className="mt-4">
              <strong>Notes:</strong>
              <p className="whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
