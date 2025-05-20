import { useEffect } from 'react';
import { useAuth } from '../../../hooks/useContext';
import { supabase } from '../../../lib/supabase';
import {
  RawTransaction,
  Transaction,
  TransactionsImportError,
  TransactionsImportStats,
} from '../../../types/transaction';

interface ImportDataProps {
  transactions: RawTransaction[];
  inAccountId: string;
  forDocumentId: string | null;
  onImportCompleted: (stats: TransactionsImportStats) => void;
}
export function CSVImporting({
  transactions,
  inAccountId,
  forDocumentId,
  onImportCompleted,
}: ImportDataProps) {
  const { userId } = useAuth();
  if (!userId) throw new Error('User not found');
  if (!inAccountId) throw new Error('Account ID not found');
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      importTransactions();
    }
  }, []);

  const importTransactions = async () => {
    const stats: TransactionsImportStats = {
      total: transactions.length,
      successful: 0,
      failed: 0,

      errors: [] as TransactionsImportError[],
      imported: [],
      skipped: [],
    };

    const selectedCSVTransactions = transactions.filter((t) => t.selected);
    stats.skipped = transactions
      .filter((t) => !t.selected)
      .map((t) => ({
        id: null,
        amount: t.amount,
        description: t.description,
        date: t.date,
        account_id: inAccountId,
        user_id: userId,
        type: 'account',
        document_id: forDocumentId,
        skipped: true,
      })) as unknown as Transaction[];

    for (const transaction of selectedCSVTransactions) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            amount: transaction.amount,
            description: transaction.description,
            date: transaction.date,
            assigned_date: transaction.date,
            account_id: inAccountId,
            type: 'account',
            document_id: forDocumentId,
          })
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          stats.imported.push(data[0] as Transaction);
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
    onImportCompleted(stats);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Importing transactions...</span>
      </div>
    </div>
  );
}
