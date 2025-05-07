import React, { useState } from 'react';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from '../shared/EmptyState';
import { DeleteTransactionModal } from './DeleteTransactionModal';

interface TransactionListProps {
  transactions: Record<string, Record<string, any[]>>;
  onDelete: (id: string) => void;
  onTransactionUpdate: () => void;
  onAddTransaction: () => void;
}

export function TransactionList({
  transactions,
  onDelete,
  onTransactionUpdate,
  onAddTransaction,
}: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<{
    id: string;
    description: string;
    amount: number;
  } | null>(null);

  const handleDelete = (transaction: { id: string; description: string; amount: number }) => {
    setSelectedTransaction(transaction);
  };

  const handleConfirmDelete = () => {
    if (selectedTransaction) {
      onDelete(selectedTransaction.id);
      setSelectedTransaction(null);
    }
  };

  if (Object.keys(transactions).length === 0) {
    return (
      <EmptyState
        title="No transactions found"
        description="Add your first transaction to get started"
        action={{
          label: 'Add Transaction',
          onClick: onAddTransaction,
        }}
      />
    );
  }

  return (
    <>
      <div className="divide-y divide-gray-200">
        {Object.entries(transactions)
          .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
          .map(([year, months]) => (
            <div key={year} className="bg-white">
              <div className="divide-y divide-gray-100">
                {Object.entries(months)
                  .sort(([monthA], [monthB]) => {
                    const dateA = new Date(`${monthA} 1, ${year}`);
                    const dateB = new Date(`${monthB} 1, ${year}`);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .map(([month, monthTransactions]) => (
                    <div key={`${year}-${month}`} className="bg-gray-50">
                      <div className="px-6 py-2 bg-gray-100">
                        <h3 className="text-sm font-medium text-gray-700">
                          {month} {year}
                        </h3>
                      </div>
                      <div className="divide-y divide-gray-200 px-6">
                        {monthTransactions.map((transaction) => (
                          <TransactionItem
                            key={transaction.id}
                            id={transaction.id}
                            description={transaction.description}
                            amount={transaction.amount}
                            date={transaction.date}
                            assignedDate={transaction.assigned_date}
                            categoryName={transaction.category?.name}
                            account_id={transaction.account_id}
                            accountName={transaction.account?.name}
                            accountIcon={transaction.account?.icon}
                            onDelete={() => handleDelete(transaction)}
                            onAssignedDateChange={onTransactionUpdate}
                            onEdit={onTransactionUpdate}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
      </div>

      {selectedTransaction && (
        <DeleteTransactionModal
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onConfirm={handleConfirmDelete}
          description={selectedTransaction.description}
          amount={selectedTransaction.amount}
        />
      )}
    </>
  );
}