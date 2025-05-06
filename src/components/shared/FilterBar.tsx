import React from 'react';
import { Filter } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  filters: {
    id: string;
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  }[];
  className?: string;
}

export function FilterBar({ filters, className = '' }: FilterBarProps) {
  return (
    <div className={`flex items-center gap-4 flex-wrap ${className}`}>
      <Filter className="w-5 h-5 text-gray-500" />
      {filters.map((filter) => (
        <div key={filter.id}>
          <label className="sr-only">{filter.label}</label>
          <select
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}