import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useContext';
import { VERSION } from '../version';
import { Upload } from 'lucide-react';
import { Modal } from '../components/shared/Modal';
import { CSVImport } from '../components/transaction/CSVImport';
import { useAccounts } from '../hooks/useAccounts';

export function Dashboard() {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    async function checkSupabaseConnection() {
      try {
        const { count, error } = await supabase
          .from('categories')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (error) throw error;
        setCategoryCount(count);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    }

    checkSupabaseConnection();
  }, [user.id]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setShowImportModal(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowImportModal(true);
    }
  };

  const handleTransactionsLoaded = () => {
    setShowImportModal(false);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".csv"
          onChange={handleFileSelect}
        />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          Drag and drop your transaction CSV file here, or{' '}
          <button
            type="button"
            className="text-indigo-600 hover:text-indigo-500"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            browse
          </button>
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Supabase Connection Test
        </h2>
        {error ? (
          <p className="text-red-600">Error: {error}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-green-600">✓ Supabase connection successful!</p>
            <p className="text-gray-600">
              You have {categoryCount === null ? '...' : categoryCount}{' '}
              {categoryCount === 1 ? 'category' : 'categories'} in your account.
            </p>
            <p className="text-gray-600">User ID: {user.id}</p>
            <p className="text-xs text-gray-400 mt-2">v{VERSION}</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Transactions"
        size="full"
      >
        {selectedFile && (
          <CSVImport
            onTransactionsLoaded={handleTransactionsLoaded}
            accounts={accounts}
            onClose={() => setShowImportModal(false)}
            initialFile={selectedFile}
          />
        )}
      </Modal>
    </div>
  );
}