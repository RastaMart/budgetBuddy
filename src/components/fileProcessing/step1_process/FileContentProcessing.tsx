import { useEffect } from 'react';
import FileProcessor from '../../../services/csvProcessor/fileProcessor';
import { useAuth } from '../../../hooks/useContext';
import { RawTransaction } from '../../../types/transaction';
import { ColumnMapping } from '../../../types/columnMapping';
import {
  cleanAmount,
  cleanDescription,
  parseDate,
} from '../../../utils/dataParser';

export interface FileContentProcessingResponse {
  rawTransactions: RawTransaction[];
  mapping: ColumnMapping;
  formatSignature: string;
  confidence: number;
}
interface fileContentProcessingProps {
  fileContent: string;
  onFileProcessed: (response: FileContentProcessingResponse) => void;
  onError: (error: string) => void;
}
export function FileContentProcessing({
  fileContent,
  onFileProcessed,
  onError,
}: fileContentProcessingProps) {
  const { userId } = useAuth();
  if (!userId) {
    throw new Error('User not found');
  }

  const csvProcessor = new FileProcessor();
  csvProcessor.init(userId);

  useEffect(() => {
    if (fileContent) {
      processFileContent();
    }
  }, [fileContent]);

  const processFileContent = async () => {
    try {
      // processCSV
      const {
        success,
        rawTransactions,
        mapping,
        formatSignature,
        confidence,
        errorMessage,
      } = await csvProcessor.processCSV(fileContent);

      if (!success && errorMessage) {
        onError('Error processing file : ' + errorMessage);
        return;
      }
      if (!success) {
        onError('Cannot get transactions from file');
        return;
      }
      onFileProcessed({
        rawTransactions: rawTransactions || [],
        mapping: mapping || {},
        formatSignature: formatSignature || '',
        confidence,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      onError('Error processing file');
    }
  };

  const validateAndParseData = async (
    rows: string[][],
    mapping: ColumnMapping
  ): Promise<{
    transactions: RawTransaction[];
    invalidRows: Array<{ row: number; errors: string[] }>;
  }> => {
    if (!mapping) {
      throw new Error('Mapping is not defined');
    }
    const results = {
      transactions: [] as RawTransaction[],
      invalidRows: [] as Array<{ row: number; errors: string[] }>,
    };

    for (const [index, row] of rows.entries()) {
      const errors: string[] = [];
      const transaction: RawTransaction = {
        date: '',
        description: '',
        amount: 0,
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
      if (mapping.amount !== undefined) {
        amount = cleanAmount(row[mapping.amount]);
      } else if (mapping.expenseAmount && mapping.incomeAmount) {
        const expenseAmount = cleanAmount(row[mapping.expenseAmount]);
        const incomeAmount = cleanAmount(row[mapping.incomeAmount]);
        amount = (
          parseFloat(incomeAmount) - parseFloat(expenseAmount)
        ).toString();
      }

      if (amount === '0' || isNaN(parseFloat(amount))) {
        errors.push('Invalid amount');
      } else {
        transaction.amount = parseFloat(amount);
      }

      if (errors.length > 0) {
        results.invalidRows.push({ row: index + 1, errors });
      } else {
        results.transactions.push(transaction);
      }
    }

    return results;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Processing your CSV file...</span>
      </div>
    </div>
  );
}
