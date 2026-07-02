import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import CategoriesTable from "@/components/admin-view/tables/CategoriesTable";
import CategoryModal from "@/components/admin-view/modals/CategoryModal";
import categoryApi from "@/api/categoryApi";
import { ChevronRight, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import FilterSelect from "@/components/common/FilterSelect";
import AdminPagination from "@/components/admin-view/AdminPagination";

const AdminCategories = () => {
  const { user, isAuthenticated, accessToken } = useSelector((s) => s.auth);

  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // filters (qName = name query, qStatus = status filter)
  const [qName, setQName] = useState("");
  const [debouncedQName, setDebouncedQName] = useState("");
  const [qStatus, setQStatus] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // modal
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const params = { page, limit };
      if (appliedStatus) params.status = appliedStatus;
      if (debouncedQName) params.q = debouncedQName;

      const res = await categoryApi.getAll(params);

      // server returns body like { success, data, pagination }
      setCategories(res?.data || []);
      setTotalPages(res?.pagination?.totalPages || 1);
      setTotalItems(res?.pagination?.totalItems || res?.data?.length || 0);
    } catch (err) {
      console.error("Error loading categories", err);
      toast.error("Lỗi tải danh sách danh mục");
    } finally {
      setIsLoading(false);
    }
  };

  // debounce name search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQName(qName.trim()), 300);
    return () => clearTimeout(t);
  }, [qName]);

  // reload when auth, paging or filters change
  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, page, debouncedQName, appliedStatus]);

  const handleAdd = () => {
    setEditing(null);
    setIsOpen(true);
  };

  const handleRowClick = (category) => {
    setEditing(category);
    setIsOpen(true);
  };

  const handleResetFilters = () => {
    setQName("");
    setQStatus("");
    setAppliedStatus("");
    setPage(1);
  };

  const applyFilters = () => {
    setAppliedStatus(qStatus);
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(qName.trim()) || Boolean(qStatus) || Boolean(appliedStatus);

  const handleSubmit = async (data) => {
    const token = accessToken || null;
    try {
      console.debug("AdminCategories: submit data", data);
      if (editing) {
        await categoryApi.update(token, editing._id, data);
        toast.success("Cập nhật danh mục thành công");
      } else {
        await categoryApi.create(token, data);
        toast.success("Thêm danh mục thành công");
      }
      console.debug("AdminCategories: save completed");
      setIsOpen(false);
      loadCategories();
    } catch (err) {
      // surface server error body when available
      console.error("Category save error", err);
      const serverMsg =
        err?.response?.data?.message || err?.response?.data || err?.message;
      console.error("Server response", err?.response);
      toast.error(serverMsg || "Lưu danh mục thất bại");
    }
  };

  const handleDelete = async (id) => {
    const token = accessToken || null;
    const confirm = window.confirm("Bạn có chắc muốn xóa danh mục này?");
    if (!confirm) return;
    try {
      await categoryApi.remove(token, id);
      toast.success("Xóa danh mục thành công");
      setIsOpen(false);
      // adjust page if needed
      if (categories.length === 1 && page > 1) setPage(page - 1);
      else loadCategories();
    } catch (err) {
      console.error("Delete category error", err);
      toast.error("Xóa danh mục thất bại");
    }
  };

  return (
    <section className="min-h-[calc(100vh-92px)] bg-[#f7f7f8] px-3 py-3">
      <header className="mb-5 flex items-center gap-2 text-lg font-bold">
        <div className="flex items-center gap-2 text-gray-900">
          <Store className="h-5 w-5" strokeWidth={1.8} />
          Quản trị hệ thống
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500" />
        <div className="text-[#34ad54]">Danh mục món ăn</div>
      </header>

      <div className="mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <div className="relative w-full lg:w-[300px]">
            <input
              type="text"
              placeholder="Tên danh mục"
              value={qName}
              onChange={(e) => {
                setQName(e.target.value);
                setPage(1);
              }}
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-base font-medium text-gray-800 outline-none placeholder:text-slate-300 focus:border-[#34ad54]"
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="text-base font-bold text-gray-500">Lọc bởi:</div>

          <FilterSelect
            label="Trạng thái"
            value={qStatus || "all"}
            onChange={(value) => {
              setQStatus(value === "all" ? "" : value);
            }}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "available", label: "Đang bán" },
              { value: "suspended", label: "Ngừng bán" },
            ]}
            className="lg:w-[220px]"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
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
          onClick={handleAdd}
          className="h-12 rounded-lg bg-[#34ad54] px-5 text-base font-bold text-white hover:bg-[#2f9b45]"
        >
          + Thêm danh mục
        </Button>
      </div>

      <section className="pb-16 w-full">
        <CategoriesTable
          categories={categories}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />

        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={limit}
          itemLabel="danh mục"
          onPageChange={setPage}
        />
      </section>

      <CategoryModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        initialData={editing}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </section>
  );
};

export default AdminCategories;


