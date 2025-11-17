'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface ProspectData {
  email: string;
  first_name: string;
  last_name?: string;
  company?: string;
  title?: string;
  custom_field_1?: string;
  custom_field_2?: string;
  custom_field_3?: string;
}

interface ProspectImportProps {
  onImportComplete?: (listId: string, count: number) => void;
  onError?: (error: string) => void;
}

export default function ProspectImport({ onImportComplete, onError }: ProspectImportProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [listName, setListName] = useState('');
  const [previewData, setPreviewData] = useState<ProspectData[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const parseCSV = useCallback((text: string): ProspectData[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain headers and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const emailIndex = headers.findIndex(h => h === 'email');
    const firstNameIndex = headers.findIndex(h => h === 'first_name' || h === 'firstname');

    if (emailIndex === -1) {
      throw new Error('CSV must contain an "email" column');
    }
    if (firstNameIndex === -1) {
      throw new Error('CSV must contain a "first_name" or "firstname" column');
    }

    const lastNameIndex = headers.findIndex(h => h === 'last_name' || h === 'lastname');
    const companyIndex = headers.findIndex(h => h === 'company');
    const titleIndex = headers.findIndex(h => h === 'title' || h === 'job_title');
    const custom1Index = headers.findIndex(h => h === 'custom_field_1' || h === 'custom1');
    const custom2Index = headers.findIndex(h => h === 'custom_field_2' || h === 'custom2');
    const custom3Index = headers.findIndex(h => h === 'custom_field_3' || h === 'custom3');

    const prospects: ProspectData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      const email = values[emailIndex]?.trim();
      const first_name = values[firstNameIndex]?.trim();

      if (!email || !first_name) {
        continue; // Skip rows with missing required fields
      }

      prospects.push({
        email,
        first_name,
        last_name: lastNameIndex !== -1 ? values[lastNameIndex]?.trim() : undefined,
        company: companyIndex !== -1 ? values[companyIndex]?.trim() : undefined,
        title: titleIndex !== -1 ? values[titleIndex]?.trim() : undefined,
        custom_field_1: custom1Index !== -1 ? values[custom1Index]?.trim() : undefined,
        custom_field_2: custom2Index !== -1 ? values[custom2Index]?.trim() : undefined,
        custom_field_3: custom3Index !== -1 ? values[custom3Index]?.trim() : undefined,
      });
    }

    return prospects;
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError('');
    setSuccess('');
    setIsProcessing(true);

    try {
      if (!file.name.endsWith('.csv')) {
        throw new Error('Please upload a CSV file');
      }

      const text = await file.text();
      const prospects = parseCSV(text);

      if (prospects.length === 0) {
        throw new Error('No valid prospects found in CSV');
      }

      setPreviewData(prospects.slice(0, 5)); // Show first 5 for preview
      
      // Auto-generate list name from filename if not set
      if (!listName) {
        const name = file.name.replace('.csv', '').replace(/[_-]/g, ' ');
        setListName(name.charAt(0).toUpperCase() + name.slice(1));
      }

      setSuccess(`Found ${prospects.length} prospects. Review and click "Import" to continue.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse CSV file';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [listName, parseCSV, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleImport = async () => {
    if (!listName.trim()) {
      setError('Please enter a list name');
      return;
    }

    if (previewData.length === 0) {
      setError('Please upload a CSV file first');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/prospects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listName: listName.trim(),
          prospects: previewData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import prospects');
      }

      setSuccess(`Successfully imported ${data.totalProspects} prospects!`);
      setPreviewData([]);
      setListName('');

      if (onImportComplete) {
        onImportComplete(data.listId, data.totalProspects);
      }

      // Refresh the page after a short delay
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import prospects';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* List Name Input */}
      <div>
        <label htmlFor="listName" className="block text-sm font-medium text-gray-700 mb-2">
          List Name
        </label>
        <input
          type="text"
          id="listName"
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          placeholder="e.g., Q4 Prospects"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isProcessing}
        />
      </div>

      {/* Drag and Drop Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drop your CSV file here
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to browse
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
          id="csv-upload"
          disabled={isProcessing}
        />
        <label
          htmlFor="csv-upload"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
        >
          Select CSV File
        </label>
        <p className="text-xs text-gray-500 mt-4">
          Required columns: email, first_name
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Preview Data */}
      {previewData.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Preview (first 5 rows)
            </h3>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((prospect, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-gray-900">{prospect.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{prospect.first_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{prospect.last_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{prospect.company || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{prospect.title || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={isProcessing || !listName.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? 'Importing...' : 'Import Prospects'}
          </button>
        </div>
      )}
    </div>
  );
}
