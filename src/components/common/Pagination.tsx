import React from 'react';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const { t } = useTranslation();
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Build page numbers with ellipsis for large page counts
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between mt-3 mb-3 gap-2 px-1">
      <div className="d-flex align-items-center gap-2 text-muted fs-13">
        <span>{t('common.showing')} {startItem}-{endItem} {t('common.of')} {totalItems} {t('common.entries')}</span>
        {onItemsPerPageChange && (
          <select
            className="form-select form-select-sm d-inline-block"
            style={{ width: 'auto' }}
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size} / {t('common.per_page')}</option>
            ))}
          </select>
        )}
      </div>
      {totalPages > 1 && (
        <nav aria-label="Page navigation">
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
                {t('common.previous')}
              </button>
            </li>
            {getPageNumbers().map((page, idx) =>
              page === '...' ? (
                <li key={`ellipsis-${idx}`} className="page-item disabled">
                  <span className="page-link">...</span>
                </li>
              ) : (
                <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => onPageChange(page as number)}>
                    {page}
                  </button>
                </li>
              )
            )}
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                {t('common.next')}
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
};

export default Pagination;
