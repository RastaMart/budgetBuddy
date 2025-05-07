import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useContext';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { BudgetCategoryModal } from '../transaction/BudgetCategoryModal';
import { DeleteRuleModal } from './DeleteRuleModal';

interface TransactionRule {
  id: string;
  description: string;
  account_id: string;
  accounts: {
    name: string;
  };
  categories: {
    name: string;
    budgets: {
      name: string;
    };
  };
}

export function TransactionRules() {
  const { user } = useAuth();
  const [rules, setRules] = useState<TransactionRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [selectedRule, setSelectedRule] = useState<TransactionRule | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    try {
      const { data, error } = await supabase
        .from('transaction_rules')
        .select(`
          id,
          description,
          account_id,
          accounts (
            name
          ),
          categories (
            name,
            budgets (
              name
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('accounts(name)')
        .order('description');

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleEditStart = (rule: TransactionRule) => {
    setEditingRuleId(rule.id);
    setEditingDescription(rule.description);
  };

  const handleEditSave = async () => {
    if (!editingRuleId) return;

    try {
      const { error } = await supabase
        .from('transaction_rules')
        .update({ description: editingDescription })
        .eq('id', editingRuleId);

      if (error) throw error;
      fetchRules();
    } catch (error) {
      console.error('Error updating rule:', error);
    } finally {
      setEditingRuleId(null);
      setEditingDescription('');
    }
  };

  const handleEditBlur = () => {
    if (editingRuleId) {
      handleEditSave();
    }
  };

  const handleDeleteClick = (rule: TransactionRule) => {
    setSelectedRule(rule);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRule) return;

    try {
      const { error } = await supabase
        .from('transaction_rules')
        .delete()
        .eq('id', selectedRule.id);

      if (error) throw error;
      fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
    } finally {
      setShowDeleteModal(false);
      setSelectedRule(null);
    }
  };

  const handleCategoryUpdate = async (categoryId: string) => {
    if (!selectedRule) return;

    try {
      const { error } = await supabase
        .from('transaction_rules')
        .update({ category_id: categoryId })
        .eq('id', selectedRule.id);

      if (error) throw error;
      fetchRules();
      setShowCategoryModal(false);
      setSelectedRule(null);
    } catch (error) {
      console.error('Error updating rule category:', error);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Group rules by account
  const groupedRules = rules.reduce((acc, rule) => {
    const accountName = rule.accounts.name;
    if (!acc[accountName]) {
      acc[accountName] = [];
    }
    acc[accountName].push(rule);
    return acc;
  }, {} as Record<string, TransactionRule[]>);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Transaction Rules</h2>
      <p className="text-sm text-gray-500">
        Rules automatically categorize transactions based on their descriptions.
      </p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="divide-y divide-gray-200">
          {rules.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No rules found. Rules are created when you save a categorization while adding or editing transactions.
            </div>
          ) : (
            Object.entries(groupedRules).map(([accountName, accountRules]) => (
              <div key={accountName}>
                <div className="bg-gray-50 px-4 py-2">
                  <h3 className="text-sm font-medium text-gray-700">{accountName}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {accountRules.map((rule) => (
                    <div key={rule.id} className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {editingRuleId === rule.id ? (
                          <input
                            type="text"
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            onBlur={handleEditBlur}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleEditSave();
                              } else if (e.key === 'Escape') {
                                setEditingRuleId(null);
                                setEditingDescription('');
                              }
                            }}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => handleEditStart(rule)}
                            className="block text-left w-full hover:bg-gray-50 rounded p-1 -m-1"
                          >
                            <div className="font-medium text-gray-900">
                              {rule.description}
                            </div>
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            setSelectedRule(rule);
                            setShowCategoryModal(true);
                          }}
                          className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          {rule.categories?.budgets?.name} - {rule.categories?.name}
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteClick(rule)}
                        className="ml-4 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedRule && (
        <>
          <DeleteRuleModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteConfirm}
            rule={selectedRule}
          />

          <BudgetCategoryModal
            isOpen={showCategoryModal}
            onClose={() => {
              setShowCategoryModal(false);
              setSelectedRule(null);
            }}
            description={selectedRule.description}
            onSelect={handleCategoryUpdate}
            account_id={selectedRule.account_id}
            skipConfirmation={true}
          />
        </>
      )}
    </div>
  );
}