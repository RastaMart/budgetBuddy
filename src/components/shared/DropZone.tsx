import { useState } from 'react';
import { Modal } from './Modal';
import { FileProcessing } from '../fileProcessing/FileProcessing';
import { PDFReviewAnalysis } from '../transaction/-PDFReviewAnalysis';
import { DropZoneUI } from './DropZoneUI';
import { useAuth } from '../../hooks/useContext';
import { TransactionsImportStats } from '../../types/transaction';

const acceptedFileTypes = ['csv', 'pdf'];
const maxSize = 5242880; // 5MB

interface DropZoneProps {
  className?: string;
  inModal?: boolean;
  onTransactionsImported: (stats: TransactionsImportStats) => void;
}

function DropZone({
  className = '',
  inModal = false,
  onTransactionsImported,
}: DropZoneProps) {
  const { userId } = useAuth();
  if (!userId) {
    console.error('DropZone: userId is not defined');
    return null;
  }
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDropFiles = (files: File[]) => {
    if (!files || files.length === 0) return;
    handleFileProcess(files[0]);
    // TODO support list
    // files.forEach((file) => {
    //   handleFileProcess(file);
    // });
  };

  const handleFileProcess = async (file: File) => {
    setSelectedFile(file);
  };

  const handleClose = () => {
    setSelectedFile(null);
  };

  return (
    <>
      {/* Import Modal */}
      {inModal && (
        <>
          <DropZoneUI
            acceptedFileTypes={acceptedFileTypes}
            maxSize={maxSize}
            className={className}
            onFileDrop={handleDropFiles}
          />
          <Modal
            title="Import Transactions"
            isOpen={selectedFile !== null}
            onClose={handleClose}
            size="full"
          >
            {selectedFile && (
              <FileProcessing
                onClose={handleClose}
                onTransactionsImported={onTransactionsImported}
                file={selectedFile}
              />
            )}
          </Modal>
        </>
      )}
      {!inModal && (
        <>
          {!selectedFile && (
            <DropZoneUI
              acceptedFileTypes={acceptedFileTypes}
              maxSize={maxSize}
              className={className}
              onFileDrop={handleDropFiles}
            />
          )}
          {selectedFile && (
            <FileProcessing
              onClose={handleClose}
              onTransactionsImported={onTransactionsImported}
              file={selectedFile}
            />
          )}
        </>
      )}

      {/* PDF Analysis Modal
      <Modal
        title="Review PDF Analysis"
        isOpen={showPDFModal}
        onClose={handleClose}
        size="full"
      >
        {showPDFModal && selectedFile && (
          <PDFReviewAnalysis
            pdfFile={selectedFile}
            onClose={handleClose}
            onAccept={handleClose}
          />
        )}
      </Modal> */}
    </>
  );
}
DropZone.whyDidYouRender = false;
export { DropZone };
