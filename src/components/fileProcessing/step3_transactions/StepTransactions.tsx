import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useContext';
import { supabase } from '../../../lib/supabase';
import {
  RawTransaction,
  TransactionsImportStats,
} from '../../../types/transaction';
import { CSVReviewTransactions } from './CSVReviewTransactions';
import { CSVImporting } from './CSVImporting';

interface StepTransactionsProps {
  transactions: RawTransaction[];
  onCancel: () => void;
  onImportCompleted: (stats: TransactionsImportStats) => void;
}

export default function StepTransactions({
  transactions,
  onCancel,
  onImportCompleted,
}: StepTransactionsProps) {
  const { userId } = useAuth();
  if (!userId) throw new Error('User not found');

  const [parsedTransactions, setParsedTransactions] = useState<
    RawTransaction[]
  >([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [transactionsSteps, setTransactionsSteps] = useState<
    'review' | 'import'
  >('review');

  useEffect(() => {
    async function doit() {
      const processTransactions = await checkForDuplicates();
      setParsedTransactions(processTransactions);
    }
    doit();
  }, []);

  const checkForDuplicates = async () => {
    const duplicateChecks = await Promise.all(
      transactions.map(async (transaction) => {
        const { data } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('date', transaction.date)
          .eq('description', transaction.description)
          .eq('amount', transaction.amount.toString());

        return {
          ...transaction,
          isDuplicate: (data?.length || 0) > 0,
          selected: (data?.length || 0) === 0,
        };
      })
    );

    return duplicateChecks;
  };

  const handleToggleTransaction = (index: number) => {
    setParsedTransactions((current) =>
      current.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleToggleAllTransactions = (selected: boolean) => {
    setParsedTransactions((current) =>
      current.map((t) => ({ ...t, selected }))
    );
  };
  const handleSelectAccount = (accountId: string) => {
    setSelectedAccount(accountId);
  };
  const handleCancel = () => {
    onCancel();
    setTransactionsSteps('review');
  };
  const handleImport = () => {
    setTransactionsSteps('import');
  };
  const handleImportCompleted = (stats: TransactionsImportStats) => {
    onImportCompleted(stats);
  };

  return (
    <>
      {(() => {
        switch (transactionsSteps) {
          case 'review':
            return (
              <CSVReviewTransactions
                transactions={parsedTransactions}
                selectedAccount={selectedAccount}
                onSelectAccount={handleSelectAccount}
                onToggleTransaction={handleToggleTransaction}
                onToggleAllTransactions={handleToggleAllTransactions}
                onCancel={handleCancel}
                onImport={handleImport}
              />
            );
          case 'import': {
            if (!selectedAccount) {
              console.error('No account selected');
              return null;
            }
            return (
              <CSVImporting
                transactions={parsedTransactions}
                inAccountId={selectedAccount}
                forDocumentId={null}
                onImportCompleted={handleImportCompleted}
              />
            );
          }
        }
      })()}
    </>
  );
}
