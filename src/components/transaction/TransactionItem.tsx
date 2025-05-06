import React, { useState } from 'react';
import { Trash2, Calendar, Edit2 } from 'lucide-react';
import { format, parseISO, isEqual } from 'date-fns';
import { Amount } from '../shared/Amount';
import { supabase } from '../../lib/supabase';
import { Modal } from '../shared/Modal';
import { AddTransactionForm } from './AddTransactionForm';
import { getAccountIcon } from '../../utils/accountIcons';

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
}: TransactionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newAssignedDate, setNewAssignedDate] = useState(assignedDate);
  const [editFormData, setEditFormData] = useState({
    description,
    amount: Math.abs(amount).toString(),
    date,
    account_id: account_id || '',
    transactionType: amount < 0 ? 'spending' : ('deposit' as 'spending' | 'deposit'),
  });

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

  const Icon = accountIcon ? getAccountIcon(accountIcon) : null;
  const datesAreDifferent = !isEqual(parseISO(date), parseISO(assignedDate));

  return (
    <>
      <div className="flex items-center py-2 text-sm">
        {/* Fixed-width section for account and date */}
        <div className="flex items-center gap-4 w-[400px] flex-shrink-0">
          {/* Account section - fixed width */}
          <div className="w-[200px] flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-gray-500 flex-shrink-0" />}
            {accountName && (
              <span className="text-gray-600 truncate">{accountName}</span>
            )}
          </div>

          {/* Date section - fixed width */}
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
              <span className={`text-gray-700 ${datesAreDifferent ? 'italic' : ''}`}>
                {format(parseISO(assignedDate), 'PPP')}
              </span>
            )}
          </div>
        </div>

        {/* Flexible-width section for description */}
        <div className="flex-1 min-w-0 px-4">
          <div className="truncate">
            <span className="font-medium text-gray-900">{description}</span>
            {categoryName && (
              <span className="text-gray-500 ml-2">• {categoryName}</span>
            )}
            {allocationName && (
              <span className="text-purple-600 ml-2">• {allocationName}</span>
            )}
          </div>
        </div>

        {/* Fixed-width section for amount and actions */}
        <div className="flex items-center gap-4 w-[200px] flex-shrink-0 justify-end">
          <Amount value={amount} />
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
    </>
  );
}