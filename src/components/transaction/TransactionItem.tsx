import React, { useState } from 'react';
import { Trash2, Calendar, Edit2, StickyNote } from 'lucide-react';
import { format, parseISO, isEqual } from 'date-fns';
import { Amount } from '../shared/Amount';
import { supabase } from '../../lib/supabase';
import { Modal } from '../shared/Modal';
import { AddTransactionForm } from './AddTransactionForm';
import { getAccountIcon } from '../../utils/accountIcons';
import { Account } from '../../types/account';
import { BudgetCategoryModal } from './BudgetCategoryModal';
import { Transaction } from '../../types/transaction';

interface TransactionItemProps {
  transaction: Transaction;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: (id: string) => void;
  onAssignedDateChange?: () => void;
  onEdit?: () => void;
  showCategory?: boolean;
  selectEnable?: boolean;
}

export function TransactionItem({
  transaction,
  isSelected,
  onSelect,
  onDelete,
  onAssignedDateChange,
  onEdit,
  showCategory = true,
  selectEnable = true,
}: TransactionItemProps) {
  // Early return if transaction is undefined
  if (!transaction) {
    return null;
  }

  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newAssignedDate, setNewAssignedDate] = useState(transaction.assigned_date || transaction.date);
  const [newDescription, setNewDescription] = useState(transaction.description || '');
  const [newAmount, setNewAmount] = useState(Math.abs(transaction.amount || 0).toString());
  const [newNote, setNewNote] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editFormData, setEditFormData] = useState({
    description: transaction.description || '',
    amount: Math.abs(transaction.amount || 0).toString(),
    description: transaction.description || '',
    amount: Math.abs(transaction.amount || 0).toString(),
    date: transaction.date,
    account_id: transaction.account_id || '',
    transactionType:
      (transaction.amount || 0) < 0 ? 'spending' : ('deposit' as 'spending' | 'deposit'),
  });

  const Icon = transaction.account?.icon ? getAccountIcon(transaction.account.icon) : null;
  const datesAreDifferent = transaction.date && transaction.assigned_date 
    ? !isEqual(parseISO(transaction.date), parseISO(transaction.assigned_date))
    : false;

  React.useEffect(() => {
    fetchAccounts();
  }, []);

  // Update note state when transaction changes
  React.useEffect(() => {
    setNewNote(transaction.note || '');
  }, [transaction.note]);

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
        .eq('id', transaction.id);

      if (error) throw error;

      if (onAssignedDateChange) {
        onAssignedDateChange();
      }
    } catch (error) {
      console.error('Error updating assigned date:', error);
      setNewAssignedDate(transaction.assigned_date || transaction.date);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDescriptionChange = async () => {
    if (newDescription === transaction.description) {
      setIsEditingDescription(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ description: newDescription })
        .eq('id', transaction.id);

      if (error) throw error;

      if (onEdit) {
        onEdit();
      }
    } catch (error) {
      console.error('Error updating description:', error);
      setNewDescription(transaction.description || '');
      setNewDescription(transaction.description || '');
    } finally {
      setIsEditingDescription(false);
    }
  };

  const handleAmountChange = async () => {
    if (parseFloat(newAmount) === Math.abs(transaction.amount || 0)) {
    if (parseFloat(newAmount) === Math.abs(transaction.amount || 0)) {
      setIsEditingAmount(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          amount:
            (transaction.amount || 0) < 0
            (transaction.amount || 0) < 0
              ? -Math.abs(parseFloat(newAmount))
              : Math.abs(parseFloat(newAmount)),
        })
        .eq('id', transaction.id);

      if (error) throw error;

      if (onEdit) {
        onEdit();
      }
    } catch (error) {
      console.error('Error updating amount:', error);
      setNewAmount(Math.abs(transaction.amount || 0).toString());
      setNewAmount(Math.abs(transaction.amount || 0).toString());
    } finally {
      setIsEditingAmount(false);
    }
  };

  const handleAccountChange = async (newAccountId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ account_id: newAccountId })
        .eq('id', transaction.id);

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
        .eq('id', transaction.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      if (onEdit) {
        onEdit();
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleNoteChange = async () => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ note: newNote || null })
        .eq('id', transaction.id);

      if (error) throw error;

      if (onEdit) {
        onEdit();
      }
      setShowNoteModal(false);
    } catch (error) {
      console.error('Error updating note:', error);
      setNewNote(transaction.note || '');
    }
  };

  const handleCategoryUpdate = async (
    newCategoryId: string,
    applyTo: 'single' | 'unassigned' | 'all'
  ) => {
    try {
      const query = supabase.from('transactions');

      switch (applyTo) {
        case 'single':
          await query
            .update({ category_id: newCategoryId })
            .eq('id', transaction.id);
          break;

        case 'unassigned':
          await query
            .update({ category_id: newCategoryId })
            .eq('description', transaction.description)
            .is('category_id', null)
            .neq('type', 'income_distribution');
          break;

        case 'all':
          await query
            .update({ category_id: newCategoryId })
            .eq('description', transaction.description)
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
    <div className="space-y-2">
      <div
        className={`flex items-center py-2 text-sm relative group ${isHovered ? 'bg-gray-100' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {selectEnable && (
          <>
            <div className="w-6 flex-shrink-0">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onSelect}
                className={`rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-opacity duration-200 ${
                  isHovered || isSelected ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>
          </>
        )}

        <div className="flex items-center gap-4 w-[400px] flex-shrink-0">
          <div className="w-[200px] flex items-center gap-2">
            {isEditingAccount ? (
              <select
                value={transaction.account_id}
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
                {transaction.account?.name && (
                  <span className="text-gray-600 truncate">
                    {transaction.account.name}
                  </span>
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
                {format(parseISO(transaction.assigned_date || transaction.date), 'PPP')}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 px-4">
          <div className="flex items-center gap-2">
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
                className="flex-1 text-left hover:bg-gray-100 rounded px-2 py-1"
              >
                <span className="font-medium text-gray-900">
                  {transaction.description}
                </span>
              </button>
            )}
            <button
              onClick={() => {
                setShowNoteModal(true);
              }}
              className={`text-gray-400 hover:text-gray-600 ${transaction.note ? 'text-indigo-500' : ''}`}
              title={transaction.note || 'Add note'}
            >
              <StickyNote className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showCategory && (
          <div className="w-[200px] flex-shrink-0">
            <button
              onClick={() => setShowBudgetModal(true)}
              className="w-full text-left hover:bg-gray-100 rounded px-2 py-1"
            >
              {transaction.category?.name ? (
                <span className="text-indigo-600">
                  {transaction.category.name}
                </span>
              ) : (
                <span className="text-gray-400">No category</span>
              )}
            </button>
          </div>
        )}

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
              <Amount value={transaction.amount || 0} />
              <Amount value={transaction.amount || 0} />
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
              onClick={() => onDelete(transaction.id)}
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

      <Modal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title="Transaction Note"
      >
        <div className="space-y-4">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full h-32 text-sm border rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Add a note..."
          />
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowNoteModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleNoteChange}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Save Note
            </button>
          </div>
        </div>
      </Modal>

      <BudgetCategoryModal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        description={transaction.description || ''}
        onSelect={handleCategoryUpdate}
        currentCategoryId={transaction.category_id}
        account_id={transaction.account_id}
      />
    </div>
  );
}
