import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import VouchersTable from "@/components/admin-view/tables/VoucherTable";
import VoucherForm from "@/components/admin-view/modals/VoucherModal";
import useAxiosPrivate from "@/api/useAxiosPrivate";
import { ChevronRight, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import FilterSelect from "@/components/common/FilterSelect";
import AdminPagination from "@/components/admin-view/AdminPagination";

const AdminVouchers = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const axiosPrivate = useAxiosPrivate();
  // State
  const [vouchers, setVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Filters
  const [active, setActive] = useState("all"); // all | true | false
  const [type, setType] = useState("all"); // all | DISCOUNT | FREESHIP
  const [appliedActive, setAppliedActive] = useState("all");
  const [appliedType, setAppliedType] = useState("all");
  const [searchCode, setSearchCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVouchers, setTotalVouchers] = useState(0);
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
          ...(appliedActive && appliedActive !== "all" ? { active: appliedActive } : {}),
          ...(appliedType && appliedType !== "all" ? { type: appliedType } : {}),
          ...(searchCode !== "" ? { code: searchCode } : {}),
          ...(appliedStartDate !== "" ? { startDate: appliedStartDate } : {}),
          ...(appliedEndDate !== "" ? { endDate: appliedEndDate } : {}),
          page,
          limit,
        },
      });
      const response = res.data;
      console.log("Fetched vouchers:", response);
      setVouchers(response.vouchers || []);
      setTotalPages(response.totalPages || 1);
      setTotalVouchers(response.totalItems || response.vouchers?.length || 0);

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
    appliedActive,
    appliedType,
    searchCode,
    appliedStartDate,
    appliedEndDate,
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
  const hasActiveFilters =
    active !== "all" ||
    type !== "all" ||
    appliedActive !== "all" ||
    appliedType !== "all" ||
    Boolean(searchCode.trim()) ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(appliedStartDate) ||
    Boolean(appliedEndDate);

  const applyFilters = () => {
    setAppliedActive(active);
    setAppliedType(type);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setPage(1);
  };

  return (
    <section className="min-h-[calc(100vh-92px)] bg-[#f7f7f8] px-3 py-3">
      <header className="mb-5 flex items-center gap-2 text-lg font-bold">
        <div className="flex items-center gap-2 text-gray-900">
          <Store className="h-5 w-5" strokeWidth={1.8} />
          Quản trị hệ thống
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500" />
        <div className="text-[#34ad54]">Quản lý voucher</div>
      </header>

      <div className="mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <div className="relative w-full lg:w-[260px]">
            <input
              type="text"
              placeholder="Mã voucher"
              value={searchCode}
              onChange={(e) => {
                setSearchCode(e.target.value);
                setPage(1);
              }}
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-base font-medium text-gray-800 outline-none placeholder:text-slate-300 focus:border-[#34ad54]"
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="text-base font-bold text-gray-500">Lọc bởi:</div>

          <FilterSelect
            label="Trạng thái"
            value={active}
            onChange={(value) => {
              setActive(value);
            }}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "true", label: "Đang hoạt động" },
              { value: "false", label: "Bị khóa" },
            ]}
            className="lg:w-[210px]"
          />

          <FilterSelect
            label="Phân loại"
            value={type}
            onChange={(value) => {
              setType(value);
            }}
            options={[
              { value: "all", label: "Tất cả phân loại" },
              { value: "DISCOUNT", label: "Giảm giá" },
              { value: "FREESHIP", label: "Freeship" },
            ]}
            className="lg:w-[210px]"
          />

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
            }}
            className="h-12 rounded-lg border border-gray-200 bg-white px-4 text-base font-bold text-gray-800 outline-none focus:border-[#34ad54]"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
            }}
            disabled={!startDate}
            className="h-12 rounded-lg border border-gray-200 bg-white px-4 text-base font-bold text-gray-800 outline-none focus:border-[#34ad54] disabled:cursor-not-allowed disabled:bg-gray-100"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setActive("all");
                setType("all");
                setSearchCode("");
                setStartDate("");
                setEndDate("");
                setAppliedActive("all");
                setAppliedType("all");
                setAppliedStartDate("");
                setAppliedEndDate("");
                setPage(1);
              }}
              className="whitespace-nowrap text-base font-bold text-[#34ad54] underline underline-offset-4 hover:text-[#2f9b45]"
            >
              Chọn mặc định
            </button>
          )}

        </div>

        <Button
          type="button"
          onClick={applyFilters}
          className="h-12 w-full min-w-[110px] shrink-0 rounded-lg bg-[#34ad54] px-5 text-base font-bold text-white hover:bg-[#2f9b45] sm:w-auto"
        >
          Áp dụng
        </Button>

        <Button
          type="button"
          onClick={handleAddVoucher}
          className="h-12 rounded-lg bg-[#34ad54] px-5 text-base font-bold text-white hover:bg-[#2f9b45]"
        >
          + Thêm Voucher
        </Button>
      </div>

      <section className="pb-16 w-full">
        <VouchersTable
          vouchers={vouchers}
          isLoading={initialLoading}
          onEdit={handleEditVoucher}
          onReload={loadVouchers}
          onDelete={handleDeleteVoucher}
        />

        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalVouchers}
          pageSize={limit}
          itemLabel="voucher"
          onPageChange={setPage}
        />
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
    </section>
  );
};

export default AdminVouchers;


