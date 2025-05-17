import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { Modal } from './Modal';
import { CSVImport } from '../transaction/CSVImport';
import { PDFReviewAnalysis } from '../transaction/PDFReviewAnalysis';
import { Account } from '../../types/account';
import { Transaction } from '../../types/transaction';

interface DropZoneProps {
  onFileProcessed?: (data: any) => void;
  acceptedFileTypes?: string[];
  maxSize?: number;
  className?: string;
  children?: React.ReactNode;
  accounts?: Account[];
  onTransactionsLoaded?: (transactions: Transaction[]) => void;
}

export function DropZone({
  onFileProcessed,
  acceptedFileTypes = ['.csv', '.pdf'],
  maxSize = 5242880, // 5MB
  className = '',
  children,
  accounts = [],
  onTransactionsLoaded = () => {},
}: DropZoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const isAccepted = acceptedFileTypes
        .map((type) => type.replace('.', '').toLowerCase())
        .includes(fileExtension || '');

      if (isAccepted) {
        setError(null);
        handleFileProcess(file);
      } else {
        setError(`Only ${acceptedFileTypes.join(', ')} files are supported`);
      }
    },
    [acceptedFileTypes]
  );

  const handleFileProcess = (file: File) => {
    setSelectedFile(file);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      setShowCSVModal(true);
    } else if (fileExtension === 'pdf') {
      setShowPDFModal(true);
    }
  };

  const handleClose = () => {
    setShowCSVModal(false);
    setShowPDFModal(false);
    setSelectedFile(null);
  };

  const handleCSVTransactionsLoaded = (transactions: Transaction[]) => {
    onTransactionsLoaded(transactions);
    if (onFileProcessed) {
      onFileProcessed({ type: 'csv', data: transactions });
    }
  };

  const handlePDFAccept = (data: any) => {
    if (onFileProcessed) {
      onFileProcessed({ type: 'pdf', data });
    }
    handleClose();
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    open: openFileDialog,
  } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce(
      (acc, type) => {
        // Convert from e.g. '.csv' to an accept object like { 'text/csv': ['.csv'] }
        const mimeType =
          type === '.csv'
            ? 'text/csv'
            : type === '.pdf'
              ? 'application/pdf'
              : `application/${type.replace('.', '')}`;
        acc[mimeType] = [type];
        return acc;
      },
      {} as Record<string, string[]>
    ),
    maxSize,
    noClick: !!children, // Disable click if children are provided (to prevent double handlers)
  });

  // Update isDragging state based on isDragActive from useDropzone
  React.useEffect(() => {
    setIsDragging(isDragActive);
  }, [isDragActive]);

  return (
    <>
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 bg-gray-50'
        } ${className}`}
      >
        <input {...getInputProps()} />

        {children || (
          <>
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop your {acceptedFileTypes.join(' or ')} file here, or{' '}
              <button
                type="button"
                className="text-indigo-600 hover:text-indigo-500"
                onClick={(e) => {
                  e.stopPropagation();
                  openFileDialog();
                }}
              >
                browse
              </button>
            </p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </>
        )}
      </div>

      {/* CSV Import Modal */}
      <Modal
        isOpen={showCSVModal}
        onClose={handleClose}
        title="Import Transactions"
        size="full"
      >
        {selectedFile && (
          <CSVImport
            onTransactionsLoaded={handleCSVTransactionsLoaded}
            accounts={accounts}
            onClose={handleClose}
            initialFile={selectedFile}
          />
        )}
      </Modal>

      {/* PDF Analysis Modal */}
      <Modal
        title="Review PDF Analysis"
        isOpen={showPDFModal && selectedFile !== null}
        onClose={handleClose}
        size="large"
      >
        {selectedFile && (
          <PDFReviewAnalysis
            pdfFile={selectedFile}
            onClose={handleClose}
            onAccept={handlePDFAccept}
          />
        )}
      </Modal>
    </>
  );
}
