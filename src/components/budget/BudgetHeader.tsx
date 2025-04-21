import React, { useState, useRef } from "react";
import { Plus, MoreVertical, Trash2 } from "lucide-react";
import { BudgetUser } from "../../services/budgetService";
import { Avatar } from "../ui/Avatar";

interface BudgetHeaderProps {
  users: BudgetUser[];
  onShare: () => void;
  onDelete: () => void;
}

export function BudgetHeader({ users, onShare, onDelete }: BudgetHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg z-10 py-1">
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Budget
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
