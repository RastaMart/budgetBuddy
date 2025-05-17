import React from 'react';
import { DropZone } from '../shared/DropZone';
import { Transaction } from '../../types/transaction';
import { Account } from '../../types/account';

interface FileProcessorProps {
  onTransactionsLoaded: (transactions: Transaction[]) => void;
  accounts: Account[];
  acceptedFileTypes?: string[];
  className?: string;
}

export function FileProcessor({
  onTransactionsLoaded,
  accounts,
  acceptedFileTypes = ['.csv', '.pdf'],
  className = '',
}: FileProcessorProps) {
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
      accounts={accounts}
      onTransactionsLoaded={onTransactionsLoaded}
      className={className}
    />
  );
}
