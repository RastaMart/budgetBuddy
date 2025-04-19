import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { parseDate, cleanAmount, cleanDescription } from '../../utils/dateParser';
import { format, parseISO } from 'date-fns';

interface CSVTransaction {
  date: string;
  description: string;
  amount: string;
  budget?: string;
  isDuplicate?: boolean;
  selected?: boolean;
}

interface CSVImportProps {
  onTransactionsLoaded: (transactions: CSVTransaction[]) => void;
  budgets: Array<{ id: string; name: string }>;
  onClose?: () => void;
}

interface CSVPreview {
  headers: string[];
  rows: string[][];
}

interface ImportError {
  row: number;
  error: string;
  data: CSVTransaction;
}

export function CSVImport({ onTransactionsLoaded, budgets, onClose }: CSVImportProps) {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
  const [mappingStep, setMappingStep] = useState<'initial' | 'date' | 'description' | 'amount-type' | 'amount' | 'amount-split' | 'review' | 'importing' | 'complete'>('initial');
  const [columnMapping, setColumnMapping] = useState<{
    date?: number;
    description?: number;
    amount?: number;
    spending?: number;
    deposit?: number;
  }>({});
  const [isSingleAmountColumn, setIsSingleAmountColumn] = useState<boolean | null>(null);
  const [importStats, setImportStats] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: ImportError[];
  }>({ total: 0, successful: 0, failed: 0, errors: [] });
  const [parsedTransactions, setParsedTransactions] = useState<CSVTransaction[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processCSV = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines
        .slice(1)
        .filter(line => line.trim())
        .map(line => line.split(',').map(cell => cell.trim()));

      setCsvPreview({ headers, rows });
      setMappingStep('date');
    } catch (err) {
      setError('Error processing CSV file. Please check the format and try again.');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      await processCSV(file);
    } else {
      setError('Please upload a CSV file');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processCSV(file);
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
    
    const { transactions } = await validateAndParseData(csvPreview.rows, mapping);
    const transactionsWithDuplicates = await checkForDuplicates(transactions);
    setParsedTransactions(transactionsWithDuplicates);
    setMappingStep('review');
  };

  const handleAmountTypeSelection = (singleColumn: boolean) => {
    setIsSingleAmountColumn(singleColumn);
    setMappingStep(singleColumn ? 'amount' : 'amount-split');
  };

  const checkForDuplicates = async (transactions: CSVTransaction[]) => {
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
          selected: (data?.length || 0) === 0
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
      let transaction: CSVTransaction = {
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
    setParsedTransactions(current =>
      current.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t))
    );
  };

  const toggleAllTransactions = (selected: boolean) => {
    setParsedTransactions(current =>
      current.map(t => ({ ...t, selected }))
    );
  };

  const importTransactions = async (transactions: CSVTransaction[]) => {
    setMappingStep('importing');
    const stats = {
      total: transactions.length,
      successful: 0,
      failed: 0,
      errors: [] as ImportError[],
    };

    const selectedTransactions = transactions.filter(t => t.selected);

    for (const transaction of selectedTransactions) {
      try {
        const { error } = await supabase.from('transactions').insert({
          user_id: user.id,
          amount: parseFloat(transaction.amount),
          description: transaction.description,
          date: transaction.date,
          budget_id: null,
        });

        if (error) throw error;
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
    onTransactionsLoaded(selectedTransactions);
  };

  const renderColumnSelection = (title: string, description: string) => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 bg-white">
              <tr>
                {csvPreview?.headers.map((header, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-50 ${
                      columnMapping.date === i ||
                      columnMapping.description === i ||
                      columnMapping.amount === i ||
                      columnMapping.spending === i ||
                      columnMapping.deposit === i
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-500'
                    }`}
                    onClick={() => handleColumnSelect(i)}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {csvPreview?.rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`px-4 py-2 text-sm whitespace-nowrap ${
                        columnMapping.date === j ||
                        columnMapping.description === j ||
                        columnMapping.amount === j ||
                        columnMapping.spending === j ||
                        columnMapping.deposit === j
                          ? 'text-indigo-900 bg-indigo-50'
                          : 'text-gray-500'
                      }`}
                      onClick={() => handleColumnSelect(j)}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Review Transactions</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select which transactions to import. Duplicates are unselected by default.
          </p>
        </div>
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 bg-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    checked={parsedTransactions.every(t => t.selected)}
                    onChange={(e) => toggleAllTransactions(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {parsedTransactions.map((transaction, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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
                  <td
                    className={`px-4 py-2 text-sm font-medium text-right whitespace-nowrap ${
                      parseFloat(transaction.amount) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    ${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {parsedTransactions.filter(t => t.selected).length} of {parsedTransactions.length} transactions selected
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
                disabled={!parsedTransactions.some(t => t.selected)}
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

  const renderMappingStep = () => {
    if (!csvPreview) return null;

    switch (mappingStep) {
      case 'date':
        return renderColumnSelection(
          "Select Date Column",
          "Click on the column header or any cell in the column that contains transaction dates"
        );
      case 'description':
        return renderColumnSelection(
          "Select Description Column",
          "Click on the column header or any cell in the column that contains transaction descriptions"
        );
      case 'amount-type':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Transaction Amount Format</h3>
            <p className="mt-1 text-sm text-gray-500">How are your transactions organized?</p>
            <div className="mt-6 space-y-4">
              <button
                onClick={() => handleAmountTypeSelection(true)}
                className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <h4 className="text-sm font-medium">Single Amount Column</h4>
                <p className="mt-1 text-xs text-gray-500">
                  All transactions are in one column (positive for deposits, negative for spending)
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
        return renderColumnSelection(
          "Select Amount Column",
          "Click on the column header or any cell in the column that contains transaction amounts"
        );
      case 'amount-split':
        return renderColumnSelection(
          columnMapping.spending ? "Select Deposit Column" : "Select Spending Column",
          columnMapping.spending
            ? "Click on the column header or any cell in the column that contains deposit amounts"
            : "Click on the column header or any cell in the column that contains spending amounts"
        );
      case 'review':
        return renderReviewStep();
      case 'importing':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-600">Importing transactions...</span>
            </div>
          </div>
        );
      case 'complete':
        return (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Import Complete</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-semibold text-gray-900">{importStats.total}</div>
                  <div className="text-sm text-gray-500">Total Transactions</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-semibold text-green-600">{importStats.successful}</div>
                  <div className="text-sm text-green-700">Successfully Imported</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-semibold text-red-600">{importStats.failed}</div>
                  <div className="text-sm text-red-700">Failed to Import</div>
                </div>
              </div>

              {importStats.errors.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Failed Transactions</h4>
                  <div className="bg-red-50 rounded-lg overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      <table className="min-w-full divide-y divide-red-200">
                        <thead className="bg-red-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-red-900">Row</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-red-900">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-red-900">Description</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-red-900">Amount</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-red-900">Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-200">
                          {importStats.errors.map((error, index) => (
                            <tr key={index} className="bg-red-50">
                              <td className="px-4 py-2 text-sm text-red-900">{error.row}</td>
                              <td className="px-4 py-2 text-sm text-red-900">{error.data.date}</td>
                              <td className="px-4 py-2 text-sm text-red-900">{error.data.description}</td>
                              <td className="px-4 py-2 text-sm text-red-900 text-right">
                                ${Math.abs(parseFloat(error.data.amount)).toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-sm text-red-900">{error.error}</td>
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
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleFileSelect}
          />
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Drag and drop your CSV file here, or{' '}
            <button
              type="button"
              className="text-indigo-600 hover:text-indigo-500"
              onClick={() => fileInputRef.current?.click()}
            >
              browse
            </button>
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {renderMappingStep()}
    </div>
  );
}