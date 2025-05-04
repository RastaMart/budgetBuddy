import React from 'react';
import { Modal } from '../shared/Modal';

interface DeleteTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  description: string;
  amount: number;
}

export function DeleteTransactionModal({
  isOpen,
  onClose,
  onConfirm,
  description,
  amount,
}: DeleteTransactionModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Transaction">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Are you sure you want to delete this transaction?
        </p>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="font-medium">{description}</div>
          <div className="text-sm text-gray-500">${Math.abs(amount).toFixed(2)}</div>
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
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}