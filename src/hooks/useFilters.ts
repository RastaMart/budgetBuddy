import { useState, useCallback } from 'react';

export interface Filter<T extends string> {
  type: T;
  value: string;
}

export function useFilters<T extends string>(initialFilters: Filter<T>[]) {
  const [filters, setFilters] = useState(initialFilters);

  const updateFilter = useCallback((type: T, value: string) => {
    setFilters((current) =>
      current.map((filter) =>
        filter.type === type ? { ...filter, value } : filter
      )
    );
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return {
    filters,
    updateFilter,
    resetFilters,
  };
}