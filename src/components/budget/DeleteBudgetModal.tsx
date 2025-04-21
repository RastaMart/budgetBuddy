import React, { useState, useEffect } from "react";
import { Modal } from "../shared/Modal";

interface DeleteBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  budgetName: string;
}

export function DeleteBudgetModal({
  isOpen,
  onClose,
  onDelete,
  budgetName,
}: DeleteBudgetModalProps) {
  const [confirmation, setConfirmation] = useState("");

  // Reset confirmation text when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmation("");
    }
  }, [isOpen]);

  const handleClose = () => {
    setConfirmation("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmation === budgetName) {
      onDelete();
      setConfirmation(""); // Reset confirmation after successful deletion
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Delete Budget">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">
          This action cannot be undone. This will permanently delete the budget
          and all its categories and transactions.
        </p>
        <div>
          <label
            htmlFor="confirmation"
            className="block text-sm font-medium text-gray-700"
          >
            Please type <span className="font-semibold">{budgetName}</span> to
            confirm
          </label>
          <input
            type="text"
            id="confirmation"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Type budget name to confirm"
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={confirmation !== budgetName}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Budget
          </button>
        </div>
      </form>
    </Modal>
  );
}
