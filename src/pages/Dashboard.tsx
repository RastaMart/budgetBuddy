import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useContext';
import { VERSION } from '../version';
import { Modal } from '../components/shared/Modal';
import { CSVImport } from '../components/transaction/CSVImport';
import { PDFReviewAnalysis } from '../components/transaction/PDFReviewAnalysis';
import { useAccounts } from '../hooks/useAccounts';
import { DropZone } from '../components/shared/DropZone';

export function Dashboard() {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [showPDFModal, setShowPDFModal] = useState(false);

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

  const handleFileUpload = (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      setSelectedFile(file);
      setShowImportModal(true);
    } else if (fileExtension === 'pdf') {
      setPdfFile(file);
      setShowPDFModal(true);
    }
  };

  const handleTransactionsLoaded = () => {
    // Callback after transactions are loaded
  };

  const handleClose = () => {
    setShowImportModal(false);
    setSelectedFile(null);
  };

  const handlePDFAccept = () => {
    console.log('Process PDF file', pdfFile);
    setShowPDFModal(false);
    setPdfFile(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <DropZone
        onFileAccepted={handleFileUpload}
        acceptedFileTypes={['.csv', '.pdf']}
      />

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
            onClose={handleClose}
            initialFile={selectedFile}
          />
        )}
      </Modal>

      <Modal
        title="Review PDF Analysis"
        isOpen={showPDFModal && pdfFile !== null}
        onClose={() => setShowPDFModal(false)}
        size="large"
      >
        {pdfFile && (
          <PDFReviewAnalysis
            pdfFile={pdfFile}
            onClose={() => setShowPDFModal(false)}
            onAccept={handlePDFAccept}
          />
        )}
      </Modal>
    </div>
  );
}
