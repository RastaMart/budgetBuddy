import React from 'react';
import { Modal } from '../shared/Modal';
import { Amount } from '../shared/Amount';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  name: string;
  amount: number;
  totalSpent: number;
}

export function DeleteCategoryModal({
  isOpen,
  onClose,
  onConfirm,
  name,
  amount,
  totalSpent,
}: DeleteCategoryModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Category">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Are you sure you want to delete this category? This will also delete all associated transactions.
        </p>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="font-medium">{name}</div>
          <div className="text-sm text-gray-500 space-y-1">
            <div>Budget: <Amount value={amount} /></div>
            <div>Spent: <Amount value={totalSpent} /></div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete Category
          </button>
        </div>
      </div>
    </Modal>
  );
}