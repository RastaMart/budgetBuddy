import React from 'react';

export function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-medium text-gray-900 mb-2">Coming Soon</h2>
          <p className="text-gray-500">
            We're working on adding settings and customization options.
          </p>
        </div>
      </div>
    </div>
  );
}