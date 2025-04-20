import React, { useState, useEffect } from 'react';
import { Trash2, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { Category } from '../../types/category';
import { getTimeProgress } from '../../utils/timeProgress';
import { Modal } from '../shared/Modal';
import { AddTransactionForm } from '../transaction/AddTransactionForm';
import { TransactionItem } from '../transaction/TransactionItem';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
}

interface CategoryItemProps {
  category: Category;
  timeframe: string;
  onDelete: (id: string) => void;
  onTransactionAdded: () => void;
}

export function CategoryItem({ category, timeframe, onDelete, onTransactionAdded }: CategoryItemProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [formData, setFormData] = useState({
    category_id: category.id,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [depositData, setDepositData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const spentPercentage = ((category.total_spent || 0) / category.amount) * 100;
  const timeProgress = getTimeProgress(category.timeframe);

  useEffect(() => {
    if (isExpanded) {
      fetchTransactions();
    }
  }, [isExpanded]);

  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, description, date, assigned_date')
        .eq('category_id', category.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent, type: 'spending' | 'deposit') {
    e.preventDefault();
    if (type === 'deposit') return; // Deposits not allowed in category view
    
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

  return (
    <>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
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
                <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                <span className="text-sm text-gray-500">
                  ${category.total_spent?.toFixed(2) || '0.00'}/${category.amount.toFixed(2)} spent
                </span>
              </div>
              <div className="flex items-center gap-2">
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
            <div className="mt-2">
              <ProgressBar 
                spentPercentage={spentPercentage} 
                timeProgress={timeProgress} 
              />
            </div>

            {/* Transactions List */}
            {isExpanded && (
              <div className="mt-4 space-y-2">
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
                      assignedDate={transaction.assigned_date}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        title="Add Transaction"
      >
        <AddTransactionForm
          formData={formData}
          depositData={depositData}
          onSubmit={handleSubmit}
          onChange={(data) => setFormData({ ...formData, ...data })}
          onDepositChange={(data) => setDepositData({ ...depositData, ...data })}
          categorys={[{ id: category.id, name: category.name }]}
          selectedCategoryId={category.id}
        />
      </Modal>
    </>
  );
}