import React, { useState, useEffect } from 'react';
import { Trash2, Plus, ChevronRight, ChevronDown, ArrowDownToLine } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { Category } from '../../types/category';
import { getTimeProgress } from '../../utils/timeProgress';
import { Modal } from '../shared/Modal';
import { AddTransactionForm } from '../transaction/AddTransactionForm';
import { TransactionItem } from '../transaction/TransactionItem';
import { DeleteTransactionModal } from '../transaction/DeleteTransactionModal';
import { useAuth } from '../../hooks/useContext';
import { supabase } from '../../lib/supabase';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
}

interface CategoryItemProps {
  category: Category;
  onDelete: (id: string) => void;
  onTransactionAdded: () => void;
}

export function CategoryItem({
  category,
  onDelete,
  onTransactionAdded,
}: CategoryItemProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributedAmount, setDistributedAmount] = useState(0);
  const [formData, setFormData] = useState({
    category_id: category.id,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    transactionType: 'spending' as 'spending' | 'deposit',
  });

  const spentPercentage = ((category.total_spent || 0) / category.amount) * 100;
  const timeProgress = getTimeProgress(category.timeframe);

  useEffect(() => {
    if (isExpanded) {
      fetchTransactions();
    }
  }, [isExpanded]);

  useEffect(() => {
    calculateDistributedAmount();
  }, [transactions]);

  async function calculateDistributedAmount() {
    const distributedTransactions = transactions.filter(t => t.amount > 0);
    const total = distributedTransactions.reduce((sum, t) => sum + t.amount, 0);
    setDistributedAmount(total);
  }

  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, description, date')
        .eq('category_id', category.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        category_id: formData.category_id,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
      });

      if (error) throw error;

      setFormData({
        category_id: category.id,
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        transactionType: 'spending',
      });
      setShowTransactionModal(false);
      onTransactionAdded();
      if (isExpanded) {
        fetchTransactions();
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  }

  async function handleDeleteTransaction(transaction: Transaction) {
    setSelectedTransaction(transaction);
    setShowDeleteModal(true);
  }

  async function confirmDeleteTransaction() {
    if (!selectedTransaction) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', selectedTransaction.id);

      if (error) throw error;
      
      setShowDeleteModal(false);
      setSelectedTransaction(null);
      fetchTransactions();
      onTransactionAdded();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  }

  async function handleDistributeFunds() {
    try {
      setIsDistributing(true);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/distribute-funds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          budgetId: category.budget_id,
          categoryId: category.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to distribute funds');
      }

      fetchTransactions();
      onTransactionAdded();
    } catch (error) {
      console.error('Error distributing funds:', error);
    } finally {
      setIsDistributing(false);
    }
  }

  return (
    <div className="px-6 py-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
            <h3 className="text-lg font-medium text-gray-900">
              {category.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                ${category.total_spent?.toFixed(2) || '0.00'}
                {category.amount_type === 'fixed' && (
                  <>/${category.amount.toFixed(2)}</>
                )}{' '}
                {category.type === 'spending' ? 'spent' : 'earned'}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  category.type === 'shared_income'
                    ? 'bg-purple-100 text-purple-700'
                    : category.type === 'income'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {category.type === 'shared_income'
                  ? 'Shared Income'
                  : category.type}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(category.type === 'income' || category.type === 'shared_income') && (
              <button
                onClick={handleDistributeFunds}
                disabled={isDistributing}
                className={`text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDistributing ? 'animate-pulse' : ''
                }`}
                title="Distribute funds to spending categories"
              >
                <ArrowDownToLine className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowTransactionModal(true)}
              className="text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(category.id)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {category.amount_type === 'fixed' && (
          <ProgressBar
            spentPercentage={spentPercentage}
            timeProgress={timeProgress}
            type={category.type}
            distributedAmount={distributedAmount}
            totalAmount={category.amount}
          />
        )}

        {isExpanded && (
          <div className="mt-4 space-y-2 pl-8">
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-500">No transactions found</p>
            ) : (
              transactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  id={transaction.id}
                  description={transaction.description}
                  amount={transaction.amount}
                  date={transaction.date}
                  assignedDate={transaction.date}
                  onDelete={() => handleDeleteTransaction(transaction)}
                />
              ))
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        title="Add Transaction"
      >
        <AddTransactionForm
          formData={formData}
          onSubmit={handleSubmit}
          onChange={(data) => setFormData({ ...formData, ...data })}
          categories={[category]}
          selectedCategoryId={category.id}
          onClose={() => setShowTransactionModal(false)}
        />
      </Modal>

      {selectedTransaction && (
        <DeleteTransactionModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedTransaction(null);
          }}
          onConfirm={confirmDeleteTransaction}
          description={selectedTransaction.description}
          amount={selectedTransaction.amount}
        />
      )}
    </div>
  );
}