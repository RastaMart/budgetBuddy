import React from 'react';
import { Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TransactionItemProps {
  id: string;
  description: string;
  amount: number;
  date: string;
  budgetName?: string;
  onDelete?: (id: string) => void;
}

export function TransactionItem({ 
  id, 
  description, 
  amount, 
  date, 
  budgetName, 
  onDelete 
}: TransactionItemProps) {
  // Invert the amount for display (spending is negative)
  const displayAmount = -amount;
  
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <div className="flex items-center gap-4">
        <span className="text-gray-500 min-w-[100px]">
          {format(parseISO(date), 'PPP')}
        </span>
        <div>
          <span className="font-medium text-gray-900">
            {description}
          </span>
          {budgetName && (
            <span className="text-gray-500 ml-2">
              • {budgetName}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`font-medium ${displayAmount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
          {displayAmount > 0 ? '+' : '-'}${Math.abs(displayAmount).toFixed(2)}
        </span>
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