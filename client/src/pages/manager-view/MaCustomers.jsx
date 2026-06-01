import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Eye, PackageOpen, Plus, Search, Store } from "lucide-react";
import { toast } from "sonner";
import userApi from "@/api/userApi";

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const MaCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 0,
    total_customers: 0,
    per_page: 20,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const params = useMemo(
    () => ({
      page: pagination.current_page,
      limit: pagination.per_page,
      search: searchTerm.trim(),
    }),
    [pagination.current_page, pagination.per_page, searchTerm]
  );

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await userApi.getManagerCustomers(params);
        setCustomers(res?.data?.customers || []);
        setPagination((prev) => ({
          ...prev,
          ...(res?.data?.pagination || {}),
        }));
      } catch (error) {
        console.error("Fetch customers error:", error);
        toast.error("Không thể tải danh sách khách hàng");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [params]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const changePage = (page) => {
    setPagination((prev) => ({ ...prev, current_page: page }));
  };

  return (
    <div className="min-h-[calc(100vh-90px)] bg-gray-50 px-8 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Store className="h-8 w-8 text-gray-900" strokeWidth={1.8} />
        <span className="text-2xl font-bold text-gray-900">Quản lý bán hàng</span>
        <ChevronRight className="h-7 w-7 text-gray-500" strokeWidth={2.2} />
        <h1 className="text-3xl font-black text-[#1f2c86]">
          Danh sách khách hàng
        </h1>
      </div>

      <div className="mb-16 flex items-center gap-6">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 h-7 w-7 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Tìm theo mã khách hàng, tên, SĐT khách hàng"
            className="h-14 w-full rounded-xl border border-gray-100 bg-white pl-16 pr-5 text-2xl font-medium text-gray-700 shadow-sm outline-none placeholder:text-gray-400 focus:border-sky-300"
          />
        </div>

        <button
          type="button"
          onClick={() => toast.info("Chức năng thêm khách hàng sẽ được bổ sung sau")}
          className="flex h-14 items-center gap-2 rounded-xl border border-sky-400 bg-white px-5 text-2xl font-bold text-sky-500 hover:bg-sky-50"
        >
          <Plus className="h-7 w-7" />
          Thêm
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-gray-100 text-left text-2xl font-black text-gray-600">
              <th className="w-[5%] px-6 py-6">STT</th>
              <th className="w-[14%] px-6 py-6">Mã khách hàng</th>
              <th className="w-[18%] px-6 py-6">Tên khách hàng</th>
              <th className="w-[14%] px-6 py-6">Số điện thoại</th>
              <th className="w-[13%] px-6 py-6">Tổng chi tiêu</th>
              <th className="w-[13%] px-6 py-6">Điểm thưởng</th>
              <th className="w-[15%] px-6 py-6">Tổng SL đơn hàng</th>
              <th className="w-[8%] px-6 py-6 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="h-64 text-center text-xl text-gray-500">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={8} className="h-64">
                  <div className="flex flex-col items-center justify-center text-gray-600">
                    <PackageOpen className="h-28 w-28 text-blue-100" strokeWidth={1.2} />
                    <div className="mt-3 text-2xl font-medium">Không có dữ liệu</div>
                  </div>
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr
                  key={customer._id}
                  className="border-b border-gray-100 text-xl font-semibold text-gray-700 last:border-b-0 hover:bg-gray-50"
                >
                  <td className="px-6 py-5">{customer.stt}</td>
                  <td className="px-6 py-5">{customer.customer_code}</td>
                  <td className="truncate px-6 py-5">{customer.name || "-"}</td>
                  <td className="px-6 py-5">{customer.phone || "-"}</td>
                  <td className="px-6 py-5">
                    {formatCurrency(customer.total_spent)} VND
                  </td>
                  <td className="px-6 py-5">
                    {formatCurrency(customer.reward_points)}
                  </td>
                  <td className="px-6 py-5">{customer.total_orders}</td>
                  <td className="px-6 py-5 text-center">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-sky-500 hover:bg-sky-50"
                      title="Xem chi tiết"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.total_pages > 1 && (
        <div className="mt-6 flex items-center justify-end gap-2">
          {Array.from({ length: pagination.total_pages }, (_, index) => {
            const page = index + 1;
            return (
              <button
                key={page}
                type="button"
                onClick={() => changePage(page)}
                className={`h-10 min-w-10 rounded-lg px-3 text-sm font-bold ${
                  page === pagination.current_page
                    ? "bg-[#1f2c86] text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MaCustomers;
