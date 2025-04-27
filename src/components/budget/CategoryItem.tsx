import React, { useState, useEffect } from 'react';
import { Trash2, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { Category } from '../../types/category';
import { getTimeProgress } from '../../utils/timeProgress';
import { Modal } from '../shared/Modal';
import { AddTransactionForm } from '../transaction/AddTransactionForm';
import { TransactionItem } from '../transaction/TransactionItem';
import { useAuth } from '../../hooks/useContext';
import { supabase } from '../../lib/supabase';
import { formatAllocation } from '../../utils/formatAllocation';
import { calculateDynamicAllocations } from '../../utils/calculateDynamicAllocations';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  assigned_date: string;
  allocation_id?: string;
}

interface AllocationStats {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  total_spent: number;
  reference_total?: number;
}

export function CategoryItem({
  category,
  onDelete,
  onTransactionAdded,
}: {
  category: Category;
  onDelete: (id: string) => void;
  onTransactionAdded: () => void;
}) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allocationStats, setAllocationStats] = useState<AllocationStats[]>([]);
  const [formData, setFormData] = useState({
    category_id: category.id,
    allocation_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const spentPercentage = ((category.total_spent || 0) / category.amount) * 100;
  const timeProgress = getTimeProgress(category.timeframe);

  useEffect(() => {
    if (category.type === 'shared_income') {
      calculateAllocationStats();
    }
  }, [category, category.amount, category.timeframe]);

  useEffect(() => {
    if (isExpanded) {
      fetchTransactions();
    }
  }, [isExpanded]);

  async function calculateAllocationStats() {
    try {
      const { data: allocations } = await supabase
        .from('category_allocations')
        .select('*')
        .eq('category_id', category.id);

      if (!allocations?.length) return;

      // Use the utility function to calculate allocations
      const calculatedStats = await calculateDynamicAllocations(
        allocations,
        category.id,
        category.amount
      );

      setAllocationStats(calculatedStats);
    } catch (error) {
      console.error('Error calculating allocation stats:', error);
    }
  }

  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('category_id', category.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }

  function onNewTransactionDataChange(data: Partial<typeof formData>) {
    setFormData((prev) => ({
      ...prev,
      ...data,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      console.log('Form data:', formData);
      const { error } = await supabase.from('transactions').insert({
        user_id: user?.id,
        category_id: category.id,
        allocation_id: formData.allocation_id || null,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
        assigned_date: formData.date,
      });

      if (error) throw error;

      setFormData({
        category_id: category.id,
        allocation_id: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowTransactionModal(false);
      onTransactionAdded();
      if (isExpanded) {
        fetchTransactions();
      }
      calculateAllocationStats();
    } catch (error) {
      console.error('Error adding transaction:', error);
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

        {category.amount_type === 'fixed' &&
          category.type !== 'shared_income' && (
            <ProgressBar
              spentPercentage={spentPercentage}
              timeProgress={timeProgress}
              type={category.type}
            />
          )}

        {category.type === 'shared_income' && allocationStats.length > 0 && (
          <div className="space-y-4">
            {allocationStats.map((allocation) => {
              return (
                <div key={allocation.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {allocation.name}
                      </span>
                      {allocation.reference_total !== undefined && (
                        <span className="text-sm text-gray-500">
                          {/* (${allocation.reference_total.toFixed(2)}) */}
                          {formatAllocation(
                            allocation.percentage,
                            category.amount.toFixed(2)
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <ProgressBar
                    spentPercentage={
                      (allocation.total_spent / (allocation.amount || 1)) * 100
                    }
                    timeProgress={timeProgress}
                  />
                </div>
              );
            })}
          </div>
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
                  assignedDate={transaction.assigned_date}
                  onDelete={() => {
                    /* Handle delete */
                  }}
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
          onChange={onNewTransactionDataChange}
          categories={[category]}
          selectedCategoryId={category.id}
          onClose={() => setShowTransactionModal(false)}
        />
      </Modal>
    </div>
  );
}
