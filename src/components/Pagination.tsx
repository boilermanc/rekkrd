
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, totalItems, pageSize, onPageChange }) => {
  if (totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  // Build page numbers with ellipsis
  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push('...');
    }

    // Pages around current
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    // Always show last page
    pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 mb-2 px-1">
      <span className="text-th-text3/70 text-xs font-label tracking-widest uppercase">
        {rangeStart}–{rangeEnd} of {totalItems}
      </span>

      <div className="flex items-center gap-1.5">
        {/* Previous */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg text-xs transition-all border border-th-surface/[0.10] disabled:opacity-20 disabled:cursor-not-allowed bg-th-surface/[0.04] text-th-text2 hover:text-th-text hover:bg-th-surface/[0.08]"
          aria-label="Previous page"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page, idx) =>
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-th-text3/50 text-xs select-none">...</span>
          ) : (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-all border ${
                currentPage === page
                  ? 'bg-[#dd6e42] border-[#dd6e42] text-th-text shadow-lg shadow-[#dd6e42]/20'
                  : 'border-th-surface/[0.10] bg-th-surface/[0.04] text-th-text3 hover:text-th-text hover:bg-th-surface/[0.08]'
              }`}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 rounded-lg text-xs transition-all border border-th-surface/[0.10] disabled:opacity-20 disabled:cursor-not-allowed bg-th-surface/[0.04] text-th-text2 hover:text-th-text hover:bg-th-surface/[0.08]"
          aria-label="Next page"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
