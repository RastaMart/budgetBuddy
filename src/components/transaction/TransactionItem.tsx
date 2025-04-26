import React, { useState } from 'react';
import { Trash2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Amount } from '../shared/Amount';
import { supabase } from '../../lib/supabase';

interface TransactionItemProps {
  id: string;
  description: string;
  amount: number;
  date: string;
  assignedDate: string;
  categoryName?: string;
  allocationId?: string;
  allocationName?: string;
  onDelete?: (id: string) => void;
  onAssignedDateChange?: () => void;
}

export function TransactionItem({
  id,
  description,
  amount,
  date,
  assignedDate,
  categoryName,
  allocationName,
  onDelete,
  onAssignedDateChange,
}: TransactionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newAssignedDate, setNewAssignedDate] = useState(assignedDate);

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

  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <div className="flex items-center gap-4">
        <div className="min-w-[220px] flex items-center gap-2">
          <span className="text-gray-500">{format(parseISO(date), 'PPP')}</span>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 hover:bg-gray-100 rounded"
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
            <span className="text-gray-700">
              → {format(parseISO(assignedDate), 'PPP')}
            </span>
          )}
        </div>
        <div>
          <span className="font-medium text-gray-900">{description}</span>
          {categoryName && (
            <span className="text-gray-500 ml-2">• {categoryName}</span>
          )}
          {allocationName && (
            <span className="text-purple-600 ml-2">• {allocationName}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Amount value={amount} />
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
  );
}
