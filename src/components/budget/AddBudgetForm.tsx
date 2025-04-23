import React from 'react';
import { Plus } from 'lucide-react';

interface FormData {
  name: string;
  amount: string;
  timeframe: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
}

interface AddBudgetFormProps {
  formData: FormData;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<FormData>) => void;
}

export function AddBudgetForm({ formData, onSubmit, onChange }: AddBudgetFormProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Add Budget</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Budget Name
            </label>
            <input
              type="text"
              id="name"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={formData.name}
              onChange={(e) => onChange({ name: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Budget Amount
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
            <label htmlFor="timeframe" className="block text-sm font-medium text-gray-700">
              Timeframe
            </label>
            <select
              id="timeframe"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={formData.timeframe}
              onChange={(e) => onChange({ timeframe: e.target.value as 'weekly' | 'monthly' | 'yearly' })}
              required
            >
              <option value="weekly">Weekly</option>
              <option value="biWeekly">Biweekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Budget
          </button>
        </div>
      </form>
    </div>
  );
}