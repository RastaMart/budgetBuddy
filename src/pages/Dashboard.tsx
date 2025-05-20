import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useContext';
import { FileProcessor } from '../components/transaction/FileProcessor';
import { Transaction, TransactionsImportStats } from '../types/transaction';
import { DropZone } from '../components/shared/DropZone';

function Dashboard() {
  const { userId } = useAuth();

  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    []
  );
  if (!userId) {
    console.error('No user found');
    return <div>Please log in to view your dashboard.</div>;
  }
  useEffect(() => {
    async function checkSupabaseConnection() {
      if (!userId) return;

      try {
        const { count, error } = await supabase
          .from('categories')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (error) throw error;
        setCategoryCount(count);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    }

    checkSupabaseConnection();
  }, [userId]);

  const handleTransactionsLoaded = (stats: TransactionsImportStats) => {
    // Update recent transactions in state
    setRecentTransactions((current) => [...stats.imported, ...current]);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      {/* <FileProcessor onTransactionsImported={handleTransactionsLoaded} /> */}
      <DropZone inModal onTransactionsImported={handleTransactionsLoaded} />

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Supabase Connection Test
        </h2>
        {error ? (
          <p className="text-red-600">Error: {error}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-green-600">✓ Supabase connection successful!</p>
            <p className="text-gray-600">
              You have {categoryCount === null ? '...' : categoryCount}{' '}
              {categoryCount === 1 ? 'category' : 'categories'} in your account.
            </p>
            <p className="text-gray-600">User ID: {userId}</p>
          </div>
        )}
      </div>

      {recentTransactions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Recently Imported Transactions
          </h2>
          <p className="text-gray-600">
            {recentTransactions.length} transaction
            {recentTransactions.length !== 1 ? 's' : ''} imported
          </p>
        </div>
      )}
    </div>
  );
}
Dashboard.whyDidYouRender = false;
export { Dashboard };
