import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface FormData {
  budget_id: string;
  amount: string;
  description: string;
  date: string;
}

interface DepositFormData {
  amount: string;
  description: string;
  date: string;
}

interface AddTransactionFormProps {
  formData: FormData;
  depositData: DepositFormData;
  onSubmit: (e: React.FormEvent, type: 'spending' | 'deposit') => void;
  onChange: (data: Partial<FormData>) => void;
  onDepositChange: (data: Partial<DepositFormData>) => void;
  budgets: Array<{ id: string; name: string; }>;
  selectedBudgetId?: string;
}

export function AddTransactionForm({ 
  formData, 
  depositData,
  onSubmit, 
  onChange,
  onDepositChange, 
  budgets, 
  selectedBudgetId 
}: AddTransactionFormProps) {
  const [activeTab, setActiveTab] = useState<'spending' | 'deposit'>('spending');

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'spending'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('spending')}
        >
          Spending
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'deposit'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('deposit')}
        >
          Deposit
        </button>
      </div>

      {/* Spending Form */}
      {activeTab === 'spending' && (
        <form onSubmit={(e) => onSubmit(e, 'spending')} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {!selectedBudgetId && (
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                  Budget
                </label>
                <select
                  id="budget"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.budget_id}
                  onChange={(e) => onChange({ budget_id: e.target.value })}
                  required
                >
                  <option value="">Select a budget</option>
                  {budgets.map((budget) => (
                    <option key={budget.id} value={budget.id}>
                      {budget.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount
              </label>
              <input
                type="number"
                id="amount"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.amount}
                onChange={(e) => onChange({ amount: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                type="text"
                id="description"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.description}
                onChange={(e) => onChange({ description: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                id="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.date}
                onChange={(e) => onChange({ date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Spending
            </button>
          </div>
        </form>
      )}

      {/* Deposit Form */}
      {activeTab === 'deposit' && (
        <form onSubmit={(e) => onSubmit(e, 'deposit')} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="deposit-amount" className="block text-sm font-medium text-gray-700">
                Amount
              </label>
              <input
                type="number"
                id="deposit-amount"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={depositData.amount}
                onChange={(e) => onDepositChange({ amount: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="deposit-description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                type="text"
                id="deposit-description"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={depositData.description}
                onChange={(e) => onDepositChange({ description: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="deposit-date" className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                id="deposit-date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={depositData.date}
                onChange={(e) => onDepositChange({ date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Deposit
            </button>
          </div>
        </form>
      )}
    </div>
  );
}