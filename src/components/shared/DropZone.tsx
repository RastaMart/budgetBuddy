import React, { useCallback, useState } from 'react';
import { Modal } from './Modal';
import { CSVImport } from '../transaction/CSVImport';
import { PDFReviewAnalysis } from '../transaction/PDFReviewAnalysis';
import { Account } from '../../types/account';
import { Transaction } from '../../types/transaction';
import { DropZoneUI } from './DropZoneUI';
import { uploadCSVFile } from '../../services/storageService';
import { useAuth } from '../../hooks/useContext';

interface DropZoneProps {
  onFileProcessed?: (data: any) => void;
  acceptedFileTypes?: string[];
  maxSize?: number;
  className?: string;
  children?: React.ReactNode;
  onTransactionsLoaded?: (transactions: Transaction[]) => void;
}

function DropZone({
  onFileProcessed,
  acceptedFileTypes = ['.csv', '.pdf'],
  maxSize = 5242880, // 5MB
  className = '',
  onTransactionsLoaded = () => {},
}: DropZoneProps) {
  // console.log('DropZone', acceptedFileTypes, maxSize, className);
  const { userId } = useAuth();
  if (!userId) {
    console.error('DropZone: userId is not defined');
    return null;
  }
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // const [selectedFiles, setSelectedFiles] = useState<File | null>(null);

  const handleDropFiles = (files: File[]) => {
    console.log('DropZone onDrop', files);
    // const file = files[0];
    if (!files || files.length === 0) return;
    handleFileProcess(files[0]);
    // TODO support list
    // files.forEach((file) => {
    //   console.log('onDrop handleFileProcess', file);
    //   handleFileProcess(file);
    // });
  };

  const handleFileProcess = async (file: File) => {
    console.log('handleFileProcess', file);
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
  // const showCSVModal = !!(selectedFile && selectedFile.name.endsWith('.csv'));
  // const showPDFModal = !!(selectedFile && selectedFile.name.endsWith('.pdf'));
  return (
    <>
      <DropZoneUI
        acceptedFileTypes={acceptedFileTypes}
        maxSize={maxSize}
        className={className}
        onFileDrop={handleDropFiles}
      />

      {/* CSV Import Modal */}
      <Modal
        title="Import Transactions"
        isOpen={showCSVModal}
        onClose={handleClose}
        size="full"
      >
        {showCSVModal && selectedFile && (
          <CSVImport
            onTransactionsLoaded={handleCSVTransactionsLoaded}
            onClose={handleClose}
            file={selectedFile}
          />
        )}
      </Modal>

      {/* PDF Analysis Modal */}
      <Modal
        title="Review PDF Analysis"
        isOpen={showPDFModal}
        onClose={handleClose}
        size="full"
      >
        {showPDFModal && selectedFile && (
          <PDFReviewAnalysis
            file={selectedFile}
            onClose={handleClose}
            onAccept={handlePDFAccept}
          />
        )}
      </Modal>
    </>
  );
}
DropZone.whyDidYouRender = false;
export { DropZone };
