import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, PieChart, Receipt } from 'lucide-react';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <nav className="w-64 bg-white border-r border-gray-200">
        <div className="h-16 flex items-center px-6">
          <h1 className="text-xl font-semibold text-gray-900">CouplesBudget</h1>
        </div>
        <div className="px-3 py-4">
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