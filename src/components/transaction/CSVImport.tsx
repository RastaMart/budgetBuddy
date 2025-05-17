import React, { useState, useEffect } from 'react';
import { CSVDropzone } from './CSVDropzone';
import { CSVPreview, CSVTransaction, ImportError } from '../../types/csv';
import { Account } from '../../types/account';
import { Transaction, RawTransactions } from '../../types/transaction';
import {
  parseDate,
  cleanAmount,
  cleanDescription,
} from '../../utils/dateParser';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useContext';
import { CsvProcessor } from '../../services/csvProcessor/csvProcessor';
import { CSVProcessing } from './CSVProcessing';
import { CSVDateColumnSelector } from './CSVDateColumnSelector';
import { CSVDescriptionColumnSelector } from './CSVDescriptionColumnSelector';
import { CSVAmountTypeSelector } from './CSVAmountTypeSelector';
import { CSVAmountColumnSelector } from './CSVAmountColumnSelector';
import { CSVSplitAmountColumnSelector } from './CSVSplitAmountColumnSelector';
import { CSVReviewMapping } from './CSVReviewMapping';
import { CSVReviewTransactions } from './CSVReviewTransactions';
import { CSVImporting } from './CSVImporting';
import { CSVImportComplete } from './CSVImportComplete';
import { readCSVFile } from '../../utils/csvParser';
import { ColumnMapping } from '../../types/columnMapping';

interface CSVImportProps {
  onTransactionsLoaded: (transactions: Transaction[]) => void;
  accounts: Account[];
  onClose?: () => void;
  initialFile?: File;
}

export function CSVImport({
  onTransactionsLoaded,
  accounts,
  onClose,
  initialFile,
}: CSVImportProps) {
  const csvProcessor = new CsvProcessor();
  const { user } = useAuth();
  if (!user) {
    throw new Error('User not found');
  }
  const [error, setError] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
  const [rawContent, setRawContent] = useState<string>('');
  const [rawTransactions, setRawTransactions] = useState<RawTransactions[]>([]);
  const [mappingStep, setMappingStep] = useState<
    | 'initial'
    | 'processing'
    | 'reviewMapping'
    | 'date'
    | 'description'
    | 'amount-type'
    | 'amount'
    | 'amount-split'
    | 'reviewTransaction'
    | 'importing'
    | 'complete'
  >('initial');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>({});

  const [isSingleAmountColumn, setIsSingleAmountColumn] = useState<
    boolean | null
  >(null);
  const [importStats, setImportStats] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: ImportError[];
  }>({ total: 0, successful: 0, failed: 0, errors: [] });
  const [parsedTransactions, setParsedTransactions] = useState<
    CSVTransaction[]
  >([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [uploadedDocument, setUploadedDocument] = useState<{
    id: string;
    file_path: string;
  } | null>(null);

  useEffect(() => {
    if (initialFile) {
      handleFileSelect(initialFile);
    }
  }, [initialFile]);

  const handleFileSelect = async (file: File) => {
    try {
      csvProcessor.init(user.id);

      setMappingStep('processing');
      setError(null);

      const content = await csvProcessor.uploadFile(file);
      if (!content) {
        throw new Error('Failed to read file content');
      }
      setRawContent(content);
      // processCSV
      const {
        success,
        rawTransactions: newRawTransactions,
        mapping,
        confidence,
        errorMessage,
      } = await csvProcessor.processCSV(content);

      if (!success && errorMessage) {
        throw new Error(errorMessage);
      }

      const { headers, rows } = await readCSVFile(content);
      setCsvPreview({ headers, rows });

      if (success && confidence > 0.5 && mapping != null) {
        setColumnMapping(mapping);
        if (newRawTransactions) {
          setRawTransactions(newRawTransactions);
        }
        setMappingStep('reviewMapping');
      } else {
        // Parse CSV content
        setMappingStep('date');
      }
    } catch (error) {
      console.error('Error processing CSV file:', error);

      setError(
        'Error processing CSV file. Please check the format and try again.'
      );
      setMappingStep('initial');
    }
  };

  const handleRefuseMapping = () => {
    setColumnMapping({
      date: undefined,
      description: undefined,
      amount: undefined,
      expenseAmount: undefined,
      incomeAmount: undefined,
    });
    setMappingStep('date');
  };
  const handleAcceptMapping = (newMapping: ColumnMapping) => {
    setColumnMapping(newMapping);
    processTransactions(newMapping);
  };

  const handleColumnSelect = async (columnIndex: number) => {
    const newMapping = { ...columnMapping };

    switch (mappingStep) {
      case 'date':
        newMapping.date = columnIndex;
        setColumnMapping(newMapping);
        setMappingStep('description');
        break;
      case 'description':
        newMapping.description = columnIndex;
        setColumnMapping(newMapping);
        setMappingStep('amount-type');
        break;
      case 'amount':
        newMapping.amount = columnIndex;
        setColumnMapping(newMapping);
        await processTransactions(newMapping);
        break;
      case 'amount-split':
        if (!newMapping.expenseAmount) {
          newMapping.expenseAmount = columnIndex;
          setColumnMapping(newMapping);
        } else {
          newMapping.incomeAmount = columnIndex;
          setColumnMapping(newMapping);
          await processTransactions(newMapping);
        }
        break;
    }
  };

  const processTransactions = async (mapping: typeof columnMapping) => {
    if (!csvPreview) return;

    const { transactions } = await validateAndParseData(
      csvPreview.rows,
      mapping
    );
    const transactionsWithDuplicates = await checkForDuplicates(transactions);
    setParsedTransactions(transactionsWithDuplicates);
    setMappingStep('reviewTransaction');
  };

  const handleAmountTypeSelection = (singleColumn: boolean) => {
    setIsSingleAmountColumn(singleColumn);
    setMappingStep(singleColumn ? 'amount' : 'amount-split');
  };

  const checkForDuplicates = async (transactions: CSVTransaction[]) => {
    if (!user) throw new Error('User not found');

    const duplicateChecks = await Promise.all(
      transactions.map(async (transaction) => {
        const { data } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', transaction.date)
          .eq('description', transaction.description)
          .eq('amount', parseFloat(transaction.amount));

        return {
          ...transaction,
          isDuplicate: (data?.length || 0) > 0,
          selected: (data?.length || 0) === 0,
        };
      })
    );

    return duplicateChecks;
  };

  const validateAndParseData = async (
    rows: string[][],
    mapping: typeof columnMapping
  ): Promise<{
    transactions: CSVTransaction[];
    invalidRows: Array<{ row: number; errors: string[] }>;
  }> => {
    const results = {
      transactions: [] as CSVTransaction[],
      invalidRows: [] as Array<{ row: number; errors: string[] }>,
    };

    for (const [index, row] of rows.entries()) {
      const errors: string[] = [];
      const transaction: CSVTransaction = {
        date: '',
        description: '',
        amount: '0',
        selected: true,
      };

      // Parse date
      if (mapping.date !== undefined) {
        const parsedDate = parseDate(row[mapping.date]);
        if (!parsedDate) {
          errors.push(`Invalid date format: ${row[mapping.date]}`);
        } else {
          transaction.date = parsedDate;
        }
      }

      // Parse description
      if (mapping.description !== undefined) {
        const cleanedDescription = cleanDescription(row[mapping.description]);
        if (!cleanedDescription) {
          errors.push('Description is required');
        } else {
          transaction.description = cleanedDescription;
        }
      }

      // Parse amount
      let amount = '0';
      if (isSingleAmountColumn && mapping.amount !== undefined) {
        amount = cleanAmount(row[mapping.amount]);
      } else if (
        !isSingleAmountColumn &&
        mapping.expenseAmount &&
        mapping.incomeAmount
      ) {
        const expenseAmount = cleanAmount(row[mapping.expenseAmount]);
        const incomeAmount = cleanAmount(row[mapping.incomeAmount]);
        amount = (
          parseFloat(incomeAmount) - parseFloat(expenseAmount)
        ).toString();
      }

      if (amount === '0' || isNaN(parseFloat(amount))) {
        errors.push('Invalid amount');
      } else {
        transaction.amount = amount;
      }

      if (errors.length > 0) {
        results.invalidRows.push({ row: index + 1, errors });
      } else {
        results.transactions.push(transaction);
      }
    }

    return results;
  };

  const toggleTransactionSelection = (index: number) => {
    setParsedTransactions((current) =>
      current.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t))
    );
  };

  const toggleAllTransactions = (selected: boolean) => {
    setParsedTransactions((current) =>
      current.map((t) => ({ ...t, selected }))
    );
  };

  const importTransactions = async (transactions: CSVTransaction[]) => {
    if (!selectedAccount) {
      setError('Please select an account');
      return;
    }

    if (!user) throw new Error('User not found');

    setMappingStep('importing');
    const stats = {
      total: transactions.length,
      successful: 0,
      failed: 0,
      errors: [] as ImportError[],
    };

    const selectedCSVTransactions = transactions.filter((t) => t.selected);
    const newTransactions: Transaction[] = [];

    for (const transaction of selectedCSVTransactions) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: parseFloat(transaction.amount),
            description: transaction.description,
            date: transaction.date,
            assigned_date: transaction.date,
            account_id: selectedAccount,
            type: 'account',
            document_id: uploadedDocument?.id,
          })
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          newTransactions.push(data[0] as Transaction);
        }
        stats.successful++;
      } catch (error) {
        stats.failed++;
        stats.errors.push({
          row: stats.successful + stats.failed,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: transaction,
        });
      }
    }

    setImportStats(stats);
    setMappingStep('complete');
    onTransactionsLoaded(newTransactions);
  };

  const renderMappingStep = () => {
    if (!csvPreview) return null;

    switch (mappingStep) {
      case 'date':
        return (
          <CSVDateColumnSelector
            csvPreview={csvPreview}
            columnMapping={columnMapping}
            onColumnSelect={handleColumnSelect}
          />
        );
      case 'description':
        return (
          <CSVDescriptionColumnSelector
            csvPreview={csvPreview}
            columnMapping={columnMapping}
            onColumnSelect={handleColumnSelect}
          />
        );
      case 'amount-type':
        return (
          <CSVAmountTypeSelector
            onAmountTypeSelection={handleAmountTypeSelection}
          />
        );
      case 'amount':
        return (
          <CSVAmountColumnSelector
            csvPreview={csvPreview}
            columnMapping={columnMapping}
            onColumnSelect={handleColumnSelect}
          />
        );
      case 'amount-split':
        return (
          <CSVSplitAmountColumnSelector
            csvPreview={csvPreview}
            columnMapping={columnMapping}
            onColumnSelect={handleColumnSelect}
          />
        );
      case 'reviewTransaction':
        return (
          <CSVReviewTransactions
            parsedTransactions={parsedTransactions}
            accounts={accounts}
            selectedAccount={selectedAccount}
            onSelectAccount={setSelectedAccount}
            onToggleTransaction={toggleTransactionSelection}
            onToggleAllTransactions={toggleAllTransactions}
            onImport={() => importTransactions(parsedTransactions)}
            onCancel={onClose}
          />
        );
      case 'importing':
        return <CSVImporting />;
      case 'complete':
        return (
          <CSVImportComplete importStats={importStats} onClose={onClose} />
        );
    }
  };
  return (
    <div className="space-y-4">
      {mappingStep === 'initial' && (
        <CSVDropzone onFileSelect={handleFileSelect} error={error} />
      )}
      {mappingStep === 'processing' && <CSVProcessing />}
      {mappingStep === 'reviewMapping' && (
        <CSVReviewMapping
          rawTransactions={rawTransactions}
          rawContent={rawContent}
          onRefuseMap={handleRefuseMapping}
          onAcceptMapping={handleAcceptMapping}
        />
      )}
      {renderMappingStep()}
    </div>
  );
}
