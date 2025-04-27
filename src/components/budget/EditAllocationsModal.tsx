import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

interface Allocation {
  id: string;
  name: string;
  allocation_type: 'manual' | 'dynamic';
  percentage: number;
  reference_category_id?: string;
  calculated_percentage?: number;
  reference_amount?: number;
}

interface Category {
  id: string;
  name: string;
  budget: {
    id: string;
    name: string;
  };
}

interface EditAllocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetId: string;
  onSave: () => void;
}

export function EditAllocationsModal({
  isOpen,
  onClose,
  budgetId,
  onSave,
}: EditAllocationsModalProps) {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newAllocation, setNewAllocation] = useState({
    name: '',
    allocation_type: 'manual' as const,
    percentage: 0,
    reference_category_id: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchAllocations();
      fetchCategories();
    }
  }, [isOpen]);

  async function fetchAllocations() {
    try {
      const { data: allocationsData, error: allocationsError } = await supabase
        .from('budget_allocations')
        .select('*')
        .eq('budget_id', budgetId);

      if (allocationsError) throw allocationsError;

      // For dynamic allocations, calculate percentages based on last month's transactions
      const allocationsWithCalculations = await Promise.all(
        (allocationsData || []).map(async (allocation) => {
          if (allocation.allocation_type === 'dynamic' && allocation.reference_category_id) {
            const lastMonth = subMonths(new Date(), 1);
            const startDate = startOfMonth(lastMonth);
            const endDate = endOfMonth(lastMonth);

            // Get transactions for the reference category
            const { data: transactions } = await supabase
              .from('transactions')
              .select('amount')
              .eq('category_id', allocation.reference_category_id)
              .gte('date', format(startDate, 'yyyy-MM-dd'))
              .lte('date', format(endDate, 'yyyy-MM-dd'));

            const referenceAmount = (transactions || []).reduce(
              (sum, t) => sum + (t.amount || 0),
              0
            );

            return {
              ...allocation,
              reference_amount: referenceAmount,
            };
          }
          return allocation;
        })
      );

      // Calculate percentages for dynamic allocations
      const totalDynamicAmount = allocationsWithCalculations
        .filter((a) => a.allocation_type === 'dynamic')
        .reduce((sum, a) => sum + (a.reference_amount || 0), 0);

      const finalAllocations = allocationsWithCalculations.map((allocation) => {
        if (allocation.allocation_type === 'dynamic' && totalDynamicAmount > 0) {
          const calculatedPercentage = ((allocation.reference_amount || 0) / totalDynamicAmount) * 100;
          return {
            ...allocation,
            calculated_percentage: parseFloat(calculatedPercentage.toFixed(2)),
          };
        }
        return allocation;
      });

      setAllocations(finalAllocations);
    } catch (error) {
      console.error('Error fetching allocations:', error);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, budget:budgets(id, name)')
        .eq('type', 'income');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  async function handleAddAllocation() {
    try {
      const { error } = await supabase.from('budget_allocations').insert({
        budget_id: budgetId,
        ...newAllocation,
      });

      if (error) throw error;

      fetchAllocations();
      setNewAllocation({
        name: '',
        allocation_type: 'manual',
        percentage: 0,
        reference_category_id: '',
      });
      onSave();
    } catch (error) {
      console.error('Error adding allocation:', error);
    }
  }

  async function handleDeleteAllocation(id: string) {
    try {
      const { error } = await supabase
        .from('budget_allocations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAllocations();
      onSave();
    } catch (error) {
      console.error('Error deleting allocation:', error);
    }
  }

  const totalManualPercentage = allocations
    .filter((a) => a.allocation_type === 'manual')
    .reduce((sum, allocation) => sum + (allocation.percentage || 0), 0);

  const totalDynamicPercentage = allocations
    .filter((a) => a.allocation_type === 'dynamic')
    .reduce((sum, allocation) => sum + (allocation.calculated_percentage || 0), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Allocations">
      <div className="space-y-6">
        {/* Existing Allocations */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">
              Current Allocations
            </h3>
            <div className="text-sm text-gray-500">
              <div>Manual Total: {totalManualPercentage.toFixed(1)}%</div>
              <div>Dynamic Total: {totalDynamicPercentage.toFixed(1)}%</div>
            </div>
          </div>
          {allocations.map((allocation) => (
            <div
              key={allocation.id}
              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
            >
              <div>
                <p className="font-medium">{allocation.name}</p>
                <p className="text-sm text-gray-500">
                  {allocation.allocation_type === 'manual' ? (
                    `${allocation.percentage}%`
                  ) : (
                    <>
                      Dynamic: {allocation.calculated_percentage}%
                      {allocation.reference_amount !== undefined && (
                        <span className="ml-2">
                          (${allocation.reference_amount.toFixed(2)})
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleDeleteAllocation(allocation.id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add New Allocation */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            Add New Allocation
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                value={newAllocation.name}
                onChange={(e) =>
                  setNewAllocation({ ...newAllocation, name: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                value={newAllocation.allocation_type}
                onChange={(e) =>
                  setNewAllocation({
                    ...newAllocation,
                    allocation_type: e.target.value as 'manual' | 'dynamic',
                    percentage: 0,
                    reference_category_id: '',
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="manual">Manual</option>
                <option value="dynamic">Dynamic</option>
              </select>
            </div>

            {newAllocation.allocation_type === 'manual' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Percentage
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={newAllocation.percentage}
                  onChange={(e) =>
                    setNewAllocation({
                      ...newAllocation,
                      percentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reference Category
                </label>
                <select
                  value={newAllocation.reference_category_id}
                  onChange={(e) =>
                    setNewAllocation({
                      ...newAllocation,
                      reference_category_id: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.budget.name} - {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleAddAllocation}
                disabled={
                  !newAllocation.name ||
                  (newAllocation.allocation_type === 'manual'
                    ? !newAllocation.percentage
                    : !newAllocation.reference_category_id)
                }
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Allocation
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}