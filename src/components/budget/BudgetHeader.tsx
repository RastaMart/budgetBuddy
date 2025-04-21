import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { BudgetUser } from "../../services/budgetService";
import { Avatar } from "../ui/Avatar"; // Import the new Avatar component

interface BudgetHeaderProps {
  users: BudgetUser[];
  onShare: () => void;
  onDelete: () => void;
}

export function BudgetHeader({ users, onShare, onDelete }: BudgetHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center">
        {/* Users */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {users.map((budgetUser) => (
              <div key={budgetUser.user_id}>
                <Avatar
                  avatarUrl={budgetUser.profiles.avatar_url}
                  name={budgetUser.profiles.name}
                  email={budgetUser.profiles.email}
                  size="md"
                  showRing={true}
                />
              </div>
            ))}
            <button
              onClick={onShare}
              className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-2 ring-white hover:bg-gray-200"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={onDelete}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
