import React from 'react';
import { DropZone } from '../shared/DropZone';
import { Transaction } from '../../types/transaction';

interface FileProcessorProps {
  onTransactionsLoaded?: (transactions: Transaction[]) => void;
  className?: string;
}

function FileProcessor({
  onTransactionsLoaded = () => {},
  className = '',
}: FileProcessorProps) {
  const acceptedFileTypes = ['csv', 'pdf'];

  const handleFileProcessed = (result: any) => {
    if (result.type === 'csv') {
      onTransactionsLoaded(result.data);
    } else if (result.type === 'pdf') {
      // Handle PDF data differently if needed
      // For now we'll just log it, but in a real app you might want to process this data
      console.log('PDF processed:', result.data);

      // If the PDF processing resulted in transactions, pass them to the handler
      if (result.data && Array.isArray(result.data.transactions)) {
        onTransactionsLoaded(result.data.transactions);
      }
    }
  };

  return (
    <DropZone
      onFileProcessed={handleFileProcessed}
      acceptedFileTypes={acceptedFileTypes}
      onTransactionsLoaded={onTransactionsLoaded}
      className={className}
    />
  );
}
FileProcessor.whyDidYouRender = true;
export { FileProcessor };
