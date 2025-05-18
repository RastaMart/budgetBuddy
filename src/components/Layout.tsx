import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  Home,
  PieChart,
  Receipt,
  Settings,
  LogOut,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../hooks/useContext';
import { Avatar } from './ui/Avatar';
import { VERSION } from '../version';

export function Layout() {
  const { signOut, profile } = useAuth();
  const environment = import.meta.env.VITE_APP_ENV;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <nav className="w-64 fixed top-0 bottom-0 left-0 hidden md:flex flex-col bg-white border-r border-gray-200">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Budget Buddy</h1>
        </div>
        <div className="px-3 py-4 flex flex-col flex-1 overflow-y-auto">
          <div className="space-y-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Receipt className="w-5 h-5 mr-3" />
              Transactions
            </NavLink>
            <NavLink
              to="/accounts"
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Wallet className="w-5 h-5 mr-3" />
              Accounts
            </NavLink>
          </div>

          <div className="mt-auto space-y-2">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
            <div className="px-3 py-2 border-t border-gray-200 mt-2">
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
                  <p className="text-xs text-gray-500">
                    v{VERSION} ({environment})
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile sidebar */}
      <nav className="w-full md:hidden bg-white border-b border-gray-200 fixed top-0 z-10">
        <div className="h-16 flex items-center px-4">
          <h1 className="text-xl font-semibold text-gray-900">Budget Buddy</h1>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
