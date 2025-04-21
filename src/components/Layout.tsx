import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import { Home, PieChart, Receipt, Settings, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useContext";
import { Avatar } from "./ui/Avatar"; // Import the new Avatar component

export function Layout() {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <nav className="w-64 bg-white border-r border-gray-200">
        <div className="h-16 flex items-center px-6">
          <h1 className="text-xl font-semibold text-gray-900">CouplesBudget</h1>
        </div>
        <div className="px-3 py-4 flex flex-col h-[calc(100vh-4rem)] justify-between">
          <div className="space-y-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <Home className="w-5 h-5 mr-3" />
              Dashboard
            </NavLink>
            <NavLink
              to="/budgets"
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <PieChart className="w-5 h-5 mr-3" />
              Budgets
            </NavLink>
            <NavLink
              to="/transactions"
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <Receipt className="w-5 h-5 mr-3" />
              Transactions
            </NavLink>
          </div>

          <div className="space-y-2">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <Settings className="w-5 h-5 mr-3" />
              Settings
            </NavLink>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign out
            </button>
            <div className="px-3 py-2">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Avatar
                    avatarUrl={profile?.avatar_url}
                    name={profile?.name}
                    email={profile?.email}
                    size="md"
                  />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.name || profile?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
