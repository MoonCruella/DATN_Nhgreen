import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import VouchersTable from "@/components/admin-view/tables/VoucherTable";
import VoucherForm from "@/components/admin-view/modals/VoucherModal";
import useAxiosPrivate from "@/api/useAxiosPrivate";

const AdminVouchers = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const axiosPrivate = useAxiosPrivate();
  // State
  const [vouchers, setVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Filters
  const [active, setActive] = useState("all"); // all | true | false
  const [type, setType] = useState("all"); // all | DISCOUNT | FREESHIP
  const [searchCode, setSearchCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(5);

  // Modal + edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);

  // Load vouchers
  const loadVouchers = async () => {
    try {
      setIsLoading(true);
      const res = await axiosPrivate.get("/api/vouchers", {
        params: {
          ...(active && active !== "all" ? { active } : {}),
          ...(type && type !== "all" ? { type } : {}),
          ...(searchCode !== "" ? { code: searchCode } : {}),
          ...(startDate !== "" ? { startDate } : {}),
          ...(endDate !== "" ? { endDate } : {}),
          page,
          limit,
        },
      });
      const response = res.data;
      console.log("Fetched vouchers:", response);
      setVouchers(response.vouchers || []);
      setTotalPages(response.totalPages || 1);

      console.log("Vouchers saved:", vouchers || []);
    } catch (error) {
      console.error("Lỗi tải voucher:", error);
      toast.error("Có lỗi xảy ra khi tải voucher");
    } finally {
      setIsLoading(false);
      setInitialLoading(false);
    }
  };

  // Load vouchers khi mount hoặc khi filter/pagination thay đổi
  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      loadVouchers();
    }
  }, [
    isAuthenticated,
    user,
    active,
    type,
    searchCode,
    startDate,
    endDate,
    page,
  ]);

  // Mở form thêm mới
  const handleAddVoucher = () => {
    setEditingVoucher(null);
    setIsFormOpen(true);
  };

  // Mở form edit
  const handleEditVoucher = (voucher) => {
    setEditingVoucher(voucher);
    setIsFormOpen(true);
  };
  // Xóa voucher
  const handleDeleteVoucher = async (voucherId) => {
    const confirm = window.confirm("Bạn có chắc muốn xóa voucher này?");
    if (!confirm) return;

    try {
      await axiosPrivate.delete(`/api/vouchers/${voucherId}`); // gọi API xóa
      toast.success("Xóa voucher thành công");
      // Reload danh sách sau khi xóa
      // Nếu page hiện tại trống (vì xóa hết items) -> page - 1
      if (vouchers.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadVouchers();
      }
    } catch (error) {
      console.error("Lỗi xóa voucher:", error);
      toast.error("Xóa voucher thất bại");
    }
  };

  return (
    <main className="bg-gray-50 min-h-screen">
      {/* Filters */}
      <section className="w-full px-4 pt-8">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          {/* Active */}
          <select
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Bị khóa</option>
          </select>

          {/* Type */}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 cursor-pointer"
          >
            <option value="all">Tất cả phân loại</option>
            <option value="DISCOUNT">Giảm giá</option>
            <option value="FREESHIP">Freeship</option>
          </select>

          {/* Code */}
          <input
            type="text"
            placeholder="Tìm theo mã voucher..."
            value={searchCode}
            onChange={(e) => {
              setSearchCode(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 w-48"
          />

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg px-3 py-2 cursor-pointer"
            />
            <span>–</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              disabled={!startDate}
              className="border rounded-lg px-3 py-2 cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <button
            onClick={() => {
              setActive("all");
              setType("all");
              setSearchCode("");
              setStartDate("");
              setEndDate("");
              setPage(1); // useEffect tự load
            }}
            className="flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition cursor-pointer"
          >
            Xóa bộ lọc
          </button>

          <button
            onClick={handleAddVoucher}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition cursor-pointer"
          >
            + Thêm Voucher
          </button>
        </div>
      </section>

      {/* Vouchers Table */}
      <section className="pb-16 w-full px-4">
        <VouchersTable
          vouchers={vouchers}
          isLoading={initialLoading}
          onEdit={handleEditVoucher}
          onReload={loadVouchers}
          onDelete={handleDeleteVoucher}
        />

            {totalPages > 1 && (
              <div className="flex justify-center mt-4 gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className={`px-3 py-1 rounded ${
                    page === 1
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 text-white cursor-pointer"
                  }`}
                >
                  {"<"}
                </button>

                {[...Array(totalPages)].map((_, idx) => (
                  <button
                    key={idx + 1}
                    onClick={() => setPage(idx + 1)}
                    className={`px-3 py-1 rounded ${
                      page === idx + 1
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 cursor-pointer"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className={`px-3 py-1 rounded ${
                    page === totalPages
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 text-white cursor-pointer"
                  }`}
                >
                  {">"}
                </button>
              </div>
            )}
      </section>

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <VoucherForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          initialData={editingVoucher}
          onSubmit={async (data) => {
            try {
              if (editingVoucher) {
                await axiosPrivate.put(
                  `/api/vouchers/${editingVoucher._id}`,
                  data
                );
                toast.success("Cập nhật voucher thành công");
              } else {
                await axiosPrivate.post("/api/vouchers", data);
                toast.success("Thêm voucher thành công");
              }
              setIsFormOpen(false);
              loadVouchers();
            } catch (error) {
              console.error("Lỗi thêm/sửa voucher:", error);
              toast.error("Thêm/sửa voucher thất bại");
            }
          }}
        />
      )}
    </main>
  );
};

export default AdminVouchers;


