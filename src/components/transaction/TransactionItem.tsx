import React, { useState } from 'react';
import { Trash2, Calendar, Edit2 } from 'lucide-react';
import { format, parseISO, isEqual } from 'date-fns';
import { Amount } from '../shared/Amount';
import { supabase } from '../../lib/supabase';
import { Modal } from '../shared/Modal';
import { AddTransactionForm } from './AddTransactionForm';
import { getAccountIcon } from '../../utils/accountIcons';
import { Account } from '../../types/account';
import { BudgetCategoryModal } from './BudgetCategoryModal';

interface TransactionItemProps {
  id: string;
  description: string;
  amount: number;
  date: string;
  assignedDate: string;
  categoryName?: string;
  allocationId?: string;
  allocationName?: string;
  account_id?: string;
  accountName?: string;
  accountIcon?: string;
  onDelete?: (id: string) => void;
  onAssignedDateChange?: () => void;
  onEdit?: () => void;
  budget?: {
    id: string;
    name: string;
  };
  category_id?: string;
}

export function TransactionItem({
  id,
  description,
  amount,
  date,
  assignedDate,
  categoryName,
  allocationName,
  account_id,
  accountName,
  accountIcon,
  onDelete,
  onAssignedDateChange,
  onEdit,
  budget,
  category_id,
}: TransactionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newAssignedDate, setNewAssignedDate] = useState(assignedDate);
  const [newDescription, setNewDescription] = useState(description);
  const [newAmount, setNewAmount] = useState(Math.abs(amount).toString());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editFormData, setEditFormData] = useState({
    description,
    amount: Math.abs(amount).toString(),
    date,
    account_id: account_id || '',
    transactionType:
      amount < 0 ? 'spending' : ('deposit' as 'spending' | 'deposit'),
  });

  const Icon = accountIcon ? getAccountIcon(accountIcon) : null;
  const datesAreDifferent = !isEqual(parseISO(date), parseISO(assignedDate));

  React.useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  }

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setNewAssignedDate(newDate);

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ assigned_date: newDate })
        .eq('id', id);

      if (error) throw error;

      if (onAssignedDateChange) {
        onAssignedDateChange();
      }
    } catch (error) {
      console.error('Error updating assigned date:', error);
      setNewAssignedDate(assignedDate);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDescriptionChange = async () => {
    if (newDescription === description) {
      setIsEditingDescription(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ description: newDescription })
        .eq('id', id);

      if (error) throw error;

      if (onEdit) {
        onEdit();
      }
    } catch (error) {
      console.error('Error updating description:', error);
      setNewDescription(description);
    } finally {
      setIsEditingDescription(false);
    }
  };

  const handleAmountChange = async () => {
    if (parseFloat(newAmount) === Math.abs(amount)) {
      setIsEditingAmount(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          amount:
            amount < 0
              ? -Math.abs(parseFloat(newAmount))
              : Math.abs(parseFloat(newAmount)),
        })
        .eq('id', id);

      if (error) throw error;

      if (onEdit) {
        onEdit();
      }
    } catch (error) {
      console.error('Error updating amount:', error);
      setNewAmount(Math.abs(amount).toString());
    } finally {
      setIsEditingAmount(false);
    }
  };

  const handleAccountChange = async (newAccountId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ account_id: newAccountId })
        .eq('id', id);

      if (error) throw error;

      if (onEdit) {
        onEdit();
      }
    } catch (error) {
      console.error('Error updating account:', error);
    } finally {
      setIsEditingAccount(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          description: editFormData.description,
          amount:
            editFormData.transactionType === 'spending'
              ? -Math.abs(parseFloat(editFormData.amount))
              : Math.abs(parseFloat(editFormData.amount)),
          date: editFormData.date,
          account_id: editFormData.account_id,
        })
        .eq('id', id);

      if (error) throw error;

      setIsEditModalOpen(false);
      if (onEdit) {
        onEdit();
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleCategoryUpdate = async (
    newCategoryId: string,
    applyTo: 'single' | 'unassigned' | 'all'
  ) => {
    try {
      console.log('handleCategoryUpdate', newCategoryId, applyTo);
      const query = supabase.from('transactions');

      switch (applyTo) {
        case 'single':
          await query.update({ category_id: newCategoryId }).eq('id', id);
          break;

        case 'unassigned':
          await query
            .update({ category_id: newCategoryId })
            .eq('description', description)
            .is('category_id', null)
            .neq('type', 'income_distribution');
          break;

        case 'all':
          await query
            .update({ category_id: newCategoryId })
            .eq('description', description)
            .neq('type', 'income_distribution');
          break;
      }

      if (onEdit) {
        onEdit();
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  return (
    <>
      <div className="flex items-center py-2 text-sm">
        <div className="flex items-center gap-4 w-[400px] flex-shrink-0">
          <div className="w-[200px] flex items-center gap-2">
            {isEditingAccount ? (
              <select
                value={account_id}
                onChange={(e) => handleAccountChange(e.target.value)}
                onBlur={() => setIsEditingAccount(false)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                autoFocus
              >
                <optgroup label="Bank Accounts">
                  {accounts
                    .filter((a) => a.type === 'bank')
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Credit Cards">
                  {accounts
                    .filter((a) => a.type === 'credit')
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            ) : (
              <button
                onClick={() => setIsEditingAccount(true)}
                className="flex items-center gap-2 hover:bg-gray-100 rounded px-2 py-1"
              >
                {Icon && (
                  <Icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
                {accountName && (
                  <span className="text-gray-600 truncate">{accountName}</span>
                )}
              </button>
            )}
          </div>

          <div className="w-[200px] flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
            </button>
            {isEditing ? (
              <input
                type="date"
                value={newAssignedDate}
                onChange={handleDateChange}
                onBlur={() => setIsEditing(false)}
                className="border rounded px-2 py-1 text-sm"
                autoFocus
              />
            ) : (
              <span
                className={`text-gray-700 ${datesAreDifferent ? 'italic' : ''}`}
              >
                {format(parseISO(assignedDate), 'PPP')}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 px-4">
          {isEditingDescription ? (
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              onBlur={handleDescriptionChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleDescriptionChange();
                }
              }}
              className="w-full border rounded px-2 py-1 text-sm"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditingDescription(true)}
              className="w-full text-left hover:bg-gray-100 rounded px-2 py-1"
            >
              <span className="font-medium text-gray-900">{description}</span>
            </button>
          )}
        </div>

        <div className="w-[200px] flex-shrink-0">
          <button
            onClick={() => setShowBudgetModal(true)}
            className="w-full text-left hover:bg-gray-100 rounded px-2 py-1"
          >
            {categoryName ? (
              <span className="text-indigo-600">{categoryName}</span>
            ) : (
              <span className="text-gray-400">No category</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-4 w-[200px] flex-shrink-0 justify-end">
          {isEditingAmount ? (
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              onBlur={handleAmountChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAmountChange();
                }
              }}
              className="w-24 border rounded px-2 py-1 text-sm text-right"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditingAmount(true)}
              className="hover:bg-gray-100 rounded px-2 py-1"
            >
              <Amount value={amount} />
            </button>
          )}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="text-gray-600 hover:text-gray-800"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Transaction"
      >
        <AddTransactionForm
          formData={editFormData}
          onSubmit={handleEditSubmit}
          onChange={(data) => setEditFormData({ ...editFormData, ...data })}
          isEditing={true}
          onClose={() => setIsEditModalOpen(false)}
        />
      </Modal>

      <BudgetCategoryModal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        description={description}
        onSelect={handleCategoryUpdate}
        currentCategoryId={category_id}
      />
    </>
  );
}
