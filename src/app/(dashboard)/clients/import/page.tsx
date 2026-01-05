'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string; data?: any }>;
}

export default function ImportClientsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setImporting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/clients/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'An error occurred during import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Import Clients</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <Card className="p-4">
          <h2 className="font-semibold text-lg mb-3">Import Results</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">{result.success} clients imported successfully</span>
            </div>

            {result.failed > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">{result.failed} clients failed to import</span>
                </div>

                <div className="mt-3 space-y-2">
                  <p className="font-semibold text-sm">Failed Rows:</p>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="bg-red-50 p-2 rounded text-sm">
                        <p className="font-semibold">Row {err.row}:</p>
                        <p className="text-red-700">{err.error}</p>
                        {err.data && (
                          <p className="text-xs text-gray-600 mt-1">
                            Data: {JSON.stringify(err.data)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t">
              <Button onClick={() => router.push('/clients')}>
                View All Clients
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-lg mb-2">Upload CSV File</h2>
          <p className="text-sm text-gray-600">
            Import client data from another CRM by uploading a CSV file.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="file">CSV File *</Label>
            <div className="mt-2">
              <label
                htmlFor="file"
                className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
              >
                <div className="flex flex-col items-center space-y-2">
                  {file ? (
                    <>
                      <FileText className="w-8 h-8 text-gray-600" />
                      <span className="font-medium text-gray-600">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        Click to change file
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-600" />
                      <span className="font-medium text-gray-600">
                        Drop CSV file here, or click to select
                      </span>
                      <span className="text-xs text-gray-500">
                        CSV files only
                      </span>
                    </>
                  )}
                </div>
                <input
                  id="file"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={importing}
                />
              </label>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-md space-y-2">
            <p className="font-semibold text-sm text-blue-900">CSV Format Requirements:</p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>First row should contain column headers</li>
              <li>Required fields: <code className="bg-blue-100 px-1 rounded">Full Name</code> or <code className="bg-blue-100 px-1 rounded">First Name + Last Name</code></li>
              <li>Recommended: <code className="bg-blue-100 px-1 rounded">Email Address</code>, <code className="bg-blue-100 px-1 rounded">Phone Number</code></li>
              <li>Address fields: <code className="bg-blue-100 px-1 rounded">Address</code>, <code className="bg-blue-100 px-1 rounded">City</code>, <code className="bg-blue-100 px-1 rounded">State</code>, <code className="bg-blue-100 px-1 rounded">Zip/Postal Code</code></li>
              <li>Optional fields: <code className="bg-blue-100 px-1 rounded">Note</code>, <code className="bg-blue-100 px-1 rounded">Tags</code></li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-md">
            <p className="font-semibold text-sm text-yellow-900 mb-1">Supported Field Names:</p>
            <p className="text-sm text-yellow-800">
              The import will automatically recognize common field names like "Full Name", "First Name",
              "Last Name", "Email", "Email Address", "Phone", "Phone Number", "Address", "Street Address",
              "City", "State", "ZIP", "Zip Code", "Postal Code", "Note", "Notes", "Tags", etc.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="flex-1"
          >
            {importing ? 'Importing...' : 'Import Clients'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={importing}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
