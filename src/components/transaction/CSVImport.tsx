import React, { useState, useEffect } from 'react';
import { CSVDropzone } from './CSVDropzone';
import { CSVColumnMapping } from './CSVColumnMapping';
import { readCSVFile } from '../../utils/csvParser';
import { CSVPreview, CSVTransaction, ImportError } from '../../types/csv';
import { Account } from '../../types/account';
import { Transaction } from '../../types/transaction';
import { Amount } from '../shared/Amount';
import { format, parseISO } from 'date-fns';
import {
  parseDate,
  cleanAmount,
  cleanDescription,
} from '../../utils/dateParser';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useContext';
import { uploadCSVFile, getFileContent } from '../../services/storageService';

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
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
  const [mappingStep, setMappingStep] = useState<
    | 'initial'
    | 'uploading'
    | 'date'
    | 'description'
    | 'amount-type'
    | 'amount'
    | 'amount-split'
    | 'review'
    | 'importing'
    | 'complete'
  >('initial');
  const [columnMapping, setColumnMapping] = useState<{
    date?: number;
    description?: number;
    amount?: number;
    spending?: number;
    deposit?: number;
  }>({});
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
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (initialFile) {
      handleFileSelect(initialFile);
    }
  }, [initialFile]);

  const handleFileSelect = async (file: File) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      setMappingStep('uploading');
      setError(null);

      // Upload file to storage
      const document = await uploadCSVFile(file, user.id);
      if (!document) {
        throw new Error('Failed to upload file');
      }
      setUploadedDocument(document);

      // Get file content from storage
      const content = await getFileContent(document.file_path);
      if (!content) {
        throw new Error('Failed to read file content');
      }

      // Parse CSV content
      const { headers, rows } = await readCSVFile(content);
      setCsvPreview({ headers, rows });
      setMappingStep('date');
    } catch (error) {
      setError(
        'Error processing CSV file. Please check the format and try again.'
      );
      setMappingStep('initial');
    } finally {
      setIsProcessing(false);
    }
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
        if (!newMapping.spending) {
          newMapping.spending = columnIndex;
          setColumnMapping(newMapping);
        } else {
          newMapping.deposit = columnIndex;
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
    setMappingStep('review');
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
      } else if (!isSingleAmountColumn && mapping.spending && mapping.deposit) {
        const spending = cleanAmount(row[mapping.spending]);
        const deposit = cleanAmount(row[mapping.deposit]);
        amount = (parseFloat(deposit) - parseFloat(spending)).toString();
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
          <CSVColumnMapping
            csvPreview={csvPreview}
            columnMapping={columnMapping}
            onColumnSelect={handleColumnSelect}
            title="Select Date Column"
            description="Click on the column header or any cell in the column that contains transaction dates"
          />
        );
      case 'description':
        return (
          <CSVColumnMapping
            csvPreview={csvPreview}
            columnMapping={columnMapping}
            onColumnSelect={handleColumnSelect}
            title="Select Description Column"
            description="Click on the column header or any cell in the column that contains transaction descriptions"
          />
        );
      case 'amount-type':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">
              Transaction Amount Format
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              How are your transactions organized?
            </p>
            <div className="mt-6 space-y-4">
              <button
                onClick={() => handleAmountTypeSelection(true)}
                className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <h4 className="text-sm font-medium">Single Amount Column</h4>
                <p className="mt-1 text-xs text-gray-500">
                  All transactions are in one column (positive for deposits,
                  negative for spending)
                </p>
              </button>
              <button
                onClick={() => handleAmountTypeSelection(false)}
                className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <h4 className="text-sm font-medium">Separate Columns</h4>
                <p className="mt-1 text-xs text-gray-500">
                  Deposits and spending are in separate columns
                </p>
              </button>
            </div>
          </div>
        );
      case 'amount':
        return (
          <CSVColumnMapping
            csvPreview={csvPreview}
            columnMapping={columnMapping}
            onColumnSelect={handleColumnSelect}
            title="Select Amount Column"
            description="Click on the column header or any cell in the column that contains transaction amounts"
          />
        );
      case 'amount-split':
        return (
          <CSVColumnMapping
            csvPreview={csvPreview}
            columnMapping={columnMapping}
            onColumnSelect={handleColumnSelect}
            title={
              columnMapping.spending
                ? 'Select Deposit Column'
                : 'Select Spending Column'
            }
            description={
              columnMapping.spending
                ? 'Click on the column header or any cell in the column that contains deposit amounts'
                : 'Click on the column header or any cell in the column that contains spending amounts'
            }
          />
        );
      case 'review':
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Review Transactions
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select which transactions to import. Duplicates are unselected
                  by default.
                </p>
              </div>

              <div className="p-4 border-b">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Account
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select an account</option>
                  <optgroup label="Bank Accounts">
                    {accounts
                      .filter((a) => a.type === 'bank')
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Credit Cards">
                    {accounts
                      .filter((a) => a.type === 'credit')
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div className="overflow-x-auto max-h-[60vh]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="sticky top-0 bg-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <input
                          type="checkbox"
                          checked={parsedTransactions.every((t) => t.selected)}
                          onChange={(e) =>
                            toggleAllTransactions(e.target.checked)
                          }
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {parsedTransactions.map((transaction, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={transaction.selected}
                            onChange={() => toggleTransactionSelection(index)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-2">
                          {transaction.isDuplicate ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Duplicate
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              New
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                          {format(parseISO(transaction.date), 'PPP')}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {transaction.description}
                        </td>
                        <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                          <Amount value={parseFloat(transaction.amount)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {parsedTransactions.filter((t) => t.selected).length} of{' '}
                    {parsedTransactions.length} transactions selected
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => importTransactions(parsedTransactions)}
                      disabled={
                        !parsedTransactions.some((t) => t.selected) ||
                        !selectedAccount
                      }
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Import Selected
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'importing':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-600">
                Importing transactions...
              </span>
            </div>
          </div>
        );
      case 'complete':
        return (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Import Complete
              </h3>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-semibold text-gray-900">
                    {importStats.total}
                  </div>
                  <div className="text-sm text-gray-500">
                    Total Transactions
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-semibold text-green-600">
                    {importStats.successful}
                  </div>
                  <div className="text-sm text-green-700">
                    Successfully Imported
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-semibold text-red-600">
                    {importStats.failed}
                  </div>
                  <div className="text-sm text-red-700">Failed to Import</div>
                </div>
              </div>

              {importStats.errors.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Failed Transactions
                  </h4>
                  <div className="bg-red-50 rounded-lg overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      <table className="min-w-full divide-y divide-red-200">
                        <thead className="bg-red-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-red-900">
                              Row
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-red-900">
                              Date
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-red-900">
                              Description
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-red-900">
                              Amount
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-red-900">
                              Error
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-200">
                          {importStats.errors.map((error, index) => (
                            <tr key={index} className="bg-red-50">
                              <td className="px-4 py-2 text-sm text-red-900">
                                {error.row}
                              </td>
                              <td className="px-4 py-2 text-sm text-red-900">
                                {error.data.date}
                              </td>
                              <td className="px-4 py-2 text-sm text-red-900">
                                {error.data.description}
                              </td>
                              <td className="px-4 py-2 text-sm text-red-900 text-right">
                                $
                                {Math.abs(
                                  parseFloat(error.data.amount)
                                ).toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-sm text-red-900">
                                {error.error}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {mappingStep === 'initial' && (
        <CSVDropzone onFileSelect={handleFileSelect} error={error} />
      )}
      {renderMappingStep()}
    </div>
  );
}