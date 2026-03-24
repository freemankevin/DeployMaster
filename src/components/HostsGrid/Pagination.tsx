// Pagination component - Dark Mode
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange
}: PaginationProps) => {
  const pageSizeOptions = [10, 20, 50, 100];

  // Generate page numbers array
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-background-secondary border-t border-border-primary">
      <div className="text-xs text-text-tertiary">
        Total <span className="text-white">{totalItems}</span> items
      </div>
      <div className="flex items-center gap-6">
        {/* Items per page selection */}
        <div className="flex items-center gap-1.5">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-xs border border-border-primary rounded px-2 py-1 pr-6 focus:outline-none focus:border-macos-blue bg-background-tertiary text-white cursor-pointer"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="text-xs text-text-tertiary">/ page</span>
        </div>

        {/* Pagination navigation - Dark Mode */}
        <div className="flex items-center gap-1">
          {/* Previous page */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-7 h-7 flex items-center justify-center rounded text-text-secondary hover:bg-background-tertiary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <i className="fa-solid fa-chevron-left w-4 h-4"></i>
          </button>
          
          {/* Page numbers */}
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="w-7 h-7 flex items-center justify-center text-xs text-text-tertiary">...</span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
                  currentPage === page
                    ? 'bg-macos-blue text-white'
                    : 'text-text-secondary hover:bg-background-tertiary'
                }`}
              >
                {page}
              </button>
            )
          ))}
          
          {/* Next page */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="w-7 h-7 flex items-center justify-center rounded text-text-secondary hover:bg-background-tertiary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <i className="fa-solid fa-chevron-right w-4 h-4"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;