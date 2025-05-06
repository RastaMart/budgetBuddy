import { useState, useMemo } from 'react';

interface PaginationOptions {
  initialPage?: number;
  pageSize?: number;
}

export function usePagination<T>({
  initialPage = 1,
  pageSize = 10,
}: PaginationOptions = {}) {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const paginate = (items: T[]) => {
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  };

  const getTotalPages = (totalItems: number) => {
    return Math.ceil(totalItems / pageSize);
  };

  return {
    currentPage,
    setCurrentPage,
    paginate,
    getTotalPages,
    pageSize,
  };
}