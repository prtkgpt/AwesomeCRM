'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/debug/clients')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Insurance Debug Info</h1>

      {data?.debug && (
        <Card className="p-6 mb-6 bg-yellow-50 border-yellow-300">
          <h2 className="text-xl font-bold mb-4">Summary</h2>
          <div className="space-y-2">
            <p><strong>Total Clients:</strong> {data.debug.totalClients}</p>
            <p><strong>With Insurance:</strong> {data.debug.withInsurance}</p>
            <p><strong>Without Insurance:</strong> {data.debug.withoutInsurance}</p>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Raw Client Data (Last 10)</h2>
        <div className="space-y-4">
          {data?.data?.map((client: any) => (
            <div key={client.id} className={`p-4 rounded border-2 ${client.hasInsurance ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-300'}`}>
              <h3 className="font-bold text-lg mb-2">{client.name}</h3>
              <div className="text-sm space-y-1 font-mono">
                <p><strong>ID:</strong> {client.id}</p>
                <p><strong>hasInsurance:</strong> <span className={client.hasInsurance ? 'text-green-600 font-bold' : 'text-red-600'}>{String(client.hasInsurance)}</span></p>
                <p><strong>insuranceProvider:</strong> {client.insuranceProvider || 'null'}</p>
                <p><strong>helperBeesReferralId:</strong> {client.helperBeesReferralId || 'null'}</p>
                <p><strong>insurancePaymentAmount:</strong> {client.insurancePaymentAmount || 'null'}</p>
                <p><strong>standardCopayAmount:</strong> {client.standardCopayAmount || 'null'}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 mt-6 bg-gray-50">
        <h2 className="text-xl font-bold mb-4">Full Response</h2>
        <pre className="text-xs overflow-auto bg-white p-4 rounded border">
          {JSON.stringify(data, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
