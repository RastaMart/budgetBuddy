import React from 'react';

export function CSVImporting() {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Importing transactions...</span>
      </div>
    </div>
  );
}
