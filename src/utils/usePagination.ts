import { useState, useMemo, useCallback } from 'react';

interface UsePaginationResult<T> {
  currentPage: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (size: number) => void;
  paginatedData: T[];
  totalItems: number;
  totalPages: number;
  resetPage: () => void;
}

export function usePagination<T>(data: T[], defaultPerPage = 10): UsePaginationResult<T> {
  const [currentPage, setCurrentPageRaw] = useState(1);
  const [itemsPerPage, setItemsPerPageRaw] = useState(defaultPerPage);

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const setCurrentPage = useCallback((page: number) => {
    setCurrentPageRaw(Math.max(1, Math.min(page, Math.ceil(totalItems / itemsPerPage) || 1)));
  }, [totalItems, itemsPerPage]);

  const setItemsPerPage = useCallback((size: number) => {
    setItemsPerPageRaw(size);
    setCurrentPageRaw(1);
  }, []);

  const resetPage = useCallback(() => setCurrentPageRaw(1), []);

  // Auto-correct page if data shrinks (e.g. after filter)
  const safePage = Math.min(currentPage, totalPages || 1);
  if (safePage !== currentPage) {
    // Will be corrected on next render
    setCurrentPageRaw(safePage);
  }

  const paginatedData = useMemo(
    () => data.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage),
    [data, safePage, itemsPerPage],
  );

  return {
    currentPage: safePage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    paginatedData,
    totalItems,
    totalPages,
    resetPage,
  };
}
