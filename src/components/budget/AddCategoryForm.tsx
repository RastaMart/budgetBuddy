import React from 'react';
import { Plus } from 'lucide-react';

interface FormData {
  name: string;
  amount: string;
  timeframe: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  type: 'spending' | 'income';
  amount_type: 'fixed' | 'flexible';
}

interface AddCategoryFormProps {
  formData: FormData;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<FormData>) => void;
}

export function AddCategoryForm({ formData, onSubmit, onChange }: AddCategoryFormProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Add Category</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Category Name
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
            <label htmlFor="timeframe" className="block text-sm font-medium text-gray-700">
              Timeframe
            </label>
            <select
              id="timeframe"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={formData.timeframe}
              onChange={(e) => onChange({ timeframe: e.target.value as 'weekly' | 'biweekly' | 'monthly' | 'yearly' })}
              required
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Type
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-indigo-600"
                  name="type"
                  value="spending"
                  checked={formData.type === 'spending'}
                  onChange={(e) => onChange({ type: e.target.value as 'spending' | 'income' })}
                />
                <span className="ml-2">Spending</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-indigo-600"
                  name="type"
                  value="income"
                  checked={formData.type === 'income'}
                  onChange={(e) => onChange({ type: e.target.value as 'spending' | 'income' })}
                />
                <span className="ml-2">Income</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Type
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-indigo-600"
                  name="amount_type"
                  value="fixed"
                  checked={formData.amount_type === 'fixed'}
                  onChange={(e) => onChange({ amount_type: e.target.value as 'fixed' | 'flexible' })}
                />
                <span className="ml-2">Fixed</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-indigo-600"
                  name="amount_type"
                  value="flexible"
                  checked={formData.amount_type === 'flexible'}
                  onChange={(e) => onChange({ amount_type: e.target.value as 'fixed' | 'flexible' })}
                />
                <span className="ml-2">Flexible</span>
              </label>
            </div>
          </div>
        </div>

        {formData.amount_type === 'fixed' && (
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
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </button>
        </div>
      </form>
    </div>
  );
}