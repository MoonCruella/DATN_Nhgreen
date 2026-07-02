import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  PencilLine,
  Plus,
  Search,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import userApi from "@/api/userApi";
import CustomerCreateModal from "@/components/manager-view/modals/CustomerCreateModal";
import { useSelector } from "react-redux";

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const getRewardPoints = (customer = {}) =>
  Math.max(Number(customer.reward_points) || 0, Number(customer.coin) || 0);

const defaultPagination = {
  current_page: 1,
  total_pages: 0,
  total_customers: 0,
  per_page: 20,
};

const MaCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(defaultPagination);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const accessToken = useSelector((state) => state.auth.accessToken);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchTerm.trim());
      setPagination((prev) => ({ ...prev, current_page: 1 }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const params = useMemo(
    () => ({
      page: pagination.current_page,
      limit: pageSize,
      search: appliedSearch.trim(),
    }),
    [pagination.current_page, pageSize, appliedSearch],
  );

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!accessToken) return;

      try {
        setLoading(true);
        const res = await userApi.getManagerCustomers(params, accessToken);
        const payload = res?.data || res || {};

        setCustomers(Array.isArray(payload.customers) ? payload.customers : []);
        setPagination((prev) => ({
          ...prev,
          ...(payload.pagination || {}),
          per_page: pageSize,
        }));
      } catch (error) {
        console.error("Fetch customers error:", error);
        toast.error("Không thể tải danh sách khách hàng");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [params, pageSize, refreshKey, accessToken]);

  const totalPages = Math.max(1, pagination.total_pages || 1);
  const startIndex =
    pagination.total_customers === 0
      ? 0
      : (pagination.current_page - 1) * pageSize + 1;
  const endIndex = Math.min(
    pagination.current_page * pageSize,
    pagination.total_customers,
  );
  const hasActiveFilters = Boolean(searchTerm.trim());

  const resetFilters = () => {
    setSearchTerm("");
    setAppliedSearch("");
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const changePage = (page) => {
    if (page < 1 || page > totalPages) return;
    setPagination((prev) => ({ ...prev, current_page: page }));
  };

  return (
    <section className="min-h-[calc(100vh-92px)] bg-[#f7f7f8] px-3 py-3">
      <header className="mb-5 flex items-center gap-2 text-lg font-bold">
        <div className="flex items-center gap-2 text-gray-900">
          <Store className="h-5 w-5" strokeWidth={1.8} />
          Quản lý bán hàng
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500" />
        <div className="text-[#34ad54]">Quản lý khách hàng</div>
      </header>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-[300px]">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-base font-medium text-gray-800 outline-none placeholder:text-slate-300 focus:border-[#34ad54]"
              placeholder="Mã KH, tên, SĐT"
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            variant="outline"
            className="h-12 rounded-lg border-[#34ad54] bg-white px-5 text-base font-bold text-[#34ad54] hover:bg-green-50 hover:text-[#2f9b45]"
          >
            <Plus className="h-5 w-5" />
            Thêm
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <div className="grid grid-cols-[70px_1fr_1.45fr_1.05fr_1.05fr_0.95fr_1.05fr_0.8fr] items-center border-b border-gray-200 px-5 py-3 text-base font-bold text-slate-600">
          <div>STT</div>
          <div>Mã khách hàng</div>
          <div>Tên khách hàng</div>
          <div>Số điện thoại</div>
          <div>Tổng chi tiêu</div>
          <div>Điểm thưởng</div>
          <div>Tổng SL đơn hàng</div>
          <div>Hành động</div>
        </div>

        {loading ? (
          <div className="px-5 py-9 text-center text-base font-bold text-gray-500">
            Đang tải dữ liệu...
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-12 text-gray-600">
            <PackageOpen
              className="h-16 w-16 text-green-100"
              strokeWidth={1.2}
            />
            <div className="mt-3 text-base font-bold">
              Không có dữ liệu khách hàng
            </div>
          </div>
        ) : (
          customers.map((customer, index) => (
            <div
              key={customer._id || customer.customer_code || index}
              className="grid min-h-16 grid-cols-[70px_1fr_1.45fr_1.05fr_1.05fr_0.95fr_1.05fr_0.8fr] items-center border-b border-gray-100 px-5 text-base font-medium text-[#444] last:border-b-0"
            >
              <div>
                {customer.stt ||
                  (pagination.current_page - 1) * pageSize + index + 1}
              </div>
              <div>{customer.customer_code || "-"}</div>
              <div className="truncate font-bold text-gray-800">
                {customer.name || "-"}
              </div>
              <div>{customer.phone || "-"}</div>
              <div>{formatCurrency(customer.total_spent)} VND</div>
              <div>
                {formatCurrency(getRewardPoints(customer))}
              </div>
              <div>{formatCurrency(customer.total_orders)}</div>
              <div className="text-gray-400">
                <button
                  type="button"
                  onClick={() =>
                    toast.info("Chức năng chỉnh sửa khách hàng sẽ được bổ sung")
                  }
                  className="transition hover:text-[#34ad54]"
                  title="Chỉnh sửa"
                >
                  <PencilLine className="h-5 w-5" strokeWidth={2.1} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {pagination.total_customers > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-bold text-gray-500">
            Hiển thị {startIndex}-{endIndex} trên{" "}
            {formatCurrency(pagination.total_customers)} khách hàng
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changePage(1)}
                disabled={pagination.current_page === 1}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                «
              </button>
              <button
                type="button"
                onClick={() => changePage(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="min-w-[30px] px-2 text-center text-sm font-bold text-gray-700">
                {pagination.current_page}
              </div>

              <button
                type="button"
                onClick={() => changePage(pagination.current_page + 1)}
                disabled={pagination.current_page >= totalPages}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => changePage(totalPages)}
                disabled={pagination.current_page >= totalPages}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                »
              </button>
            </div>

            <div className="relative">
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPagination((prev) => ({ ...prev, current_page: 1 }));
                }}
                className="appearance-none rounded-md border border-gray-200 bg-white px-4 py-2 pr-8 text-sm font-bold text-gray-700 hover:border-gray-300 focus:border-[#34ad54] focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-700" />
            </div>
          </div>
        </div>
      )}

      <CustomerCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        accessToken={accessToken}
        onCreated={() => {
          setPagination((prev) => ({ ...prev, current_page: 1 }));
          setAppliedSearch("");
          setSearchTerm("");
          setRefreshKey((prev) => prev + 1);
        }}
      />
    </section>
  );
};

export default MaCustomers;
