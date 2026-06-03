import { ChevronLeft, ChevronRight } from "lucide-react";

const AdminPagination = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  itemLabel,
  onPageChange,
  disabled = false,
}) => {
  if (!totalItems) return null;

  const safeTotalPages = Math.max(1, totalPages || 1);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  const changePage = (page) => {
    if (page < 1 || page > safeTotalPages || page === currentPage || disabled) {
      return;
    }
    onPageChange(page);
  };

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm font-bold text-gray-500">
        Hiển thị {startIndex}-{endIndex} trên {totalItems} {itemLabel}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => changePage(1)}
          disabled={currentPage === 1 || disabled}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {"<<"}
        </button>
        <button
          type="button"
          onClick={() => changePage(currentPage - 1)}
          disabled={currentPage === 1 || disabled}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="min-w-[30px] px-2 text-center text-sm font-bold text-gray-700">
          {currentPage}
        </div>

        <button
          type="button"
          onClick={() => changePage(currentPage + 1)}
          disabled={currentPage >= safeTotalPages || disabled}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => changePage(safeTotalPages)}
          disabled={currentPage >= safeTotalPages || disabled}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {">>"}
        </button>
      </div>
    </div>
  );
};

export default AdminPagination;
