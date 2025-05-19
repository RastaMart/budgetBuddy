import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useContext';
import { supabase } from '../../../lib/supabase';
import { RawTransaction } from '../../../types/transaction';
import { CSVReviewTransactions } from './CSVReviewTransactions';
import { parseDate } from '../../../utils/dataParser';

interface StepTransactionsProps {
  transactions: RawTransaction[];
}

export default function stepTransactions({
  transactions,
}: StepTransactionsProps) {
  const { userId } = useAuth();
  if (!userId) throw new Error('User not found');

  const [parsedTransactions, setParsedTransactions] = useState<
    RawTransaction[]
  >([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

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
        // console.log('data', data, {
        //   userId,
        //   date: transaction.date,
        //   description: transaction.description,
        //   amount: transaction.amount,
        // });
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
    console.log('cancel');
    console.warn('cancel');
  };
  const handleImport = () => {
    const selectedTransactions = parsedTransactions.filter((t) => t.selected);
    console.log('TODO import selectedTransactions', selectedTransactions);
  };

  return (
    <>
      <CSVReviewTransactions
        transactions={parsedTransactions}
        selectedAccount={selectedAccount}
        onSelectAccount={handleSelectAccount}
        onToggleTransaction={handleToggleTransaction}
        onToggleAllTransactions={handleToggleAllTransactions}
        onCancel={handleCancel}
        onImport={handleImport}
      />
    </>
  );
}
