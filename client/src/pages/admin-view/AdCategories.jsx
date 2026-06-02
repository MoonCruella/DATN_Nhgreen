import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import CategoriesTable from "@/components/admin-view/tables/CategoriesTable";
import CategoryModal from "@/components/admin-view/modals/CategoryModal";
import categoryApi from "@/api/categoryApi";

const AdminCategories = () => {
  const { user, isAuthenticated, accessToken } = useSelector((s) => s.auth);

  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // filters (qName = name query, qStatus = status filter)
  const [qName, setQName] = useState("");
  const [debouncedQName, setDebouncedQName] = useState("");
  const [qStatus, setQStatus] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // modal
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const params = { page, limit };
      if (qStatus) params.status = qStatus;
      if (debouncedQName) params.q = debouncedQName;

      const res = await categoryApi.getAll(params);

      // server returns body like { success, data, pagination }
      setCategories(res?.data || []);
      setTotalPages(res?.pagination?.totalPages || 1);
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
  }, [isAuthenticated, user, page, debouncedQName, qStatus]);

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
    setPage(1);
  };

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
    <main className="bg-gray-50 min-h-screen">
      <section className="w-full px-4 pt-8">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="text-lg font-medium">Quản lý danh mục</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Tìm theo tên"
                value={qName}
                onChange={(e) => {
                  setQName(e.target.value);
                  setPage(1);
                }}
                className="border rounded-lg px-3 py-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
              />

              <select
                value={qStatus}
                onChange={(e) => {
                  setQStatus(e.target.value);
                  setPage(1);
                }}
                className="border rounded-lg px-3 py-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer"
              >
                <option value="">Tất cả</option>
                <option value="available">Đang bán</option>
                <option value="suspended">Ngừng bán</option>
              </select>

              <button
                onClick={handleResetFilters}
                className="px-3 py-2 bg-gray-100 rounded-lg transition hover:bg-gray-200 cursor-pointer"
              >
                Đặt lại
              </button>
            </div>

            <button
              onClick={handleAdd}
              className="bg-green-600 text-white px-4 py-2 rounded-lg transition transform hover:scale-105 hover:bg-green-700 active:scale-95 cursor-pointer"
            >
              + Thêm danh mục
            </button>
          </div>
        </div>
      </section>

      <section className="pb-16 w-full px-4">
        <CategoriesTable
          categories={categories}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />

        {totalPages > 1 && (
          <div className="flex justify-center mt-4 gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className={`px-3 py-1 rounded ${
                page === 1
                  ? "bg-gray-200 text-gray-400"
                  : "bg-green-600 text-white"
              }`}
            >
              {"<"}
            </button>
            {[...Array(totalPages)].map((_, idx) => (
              <button
                key={idx}
                onClick={() => setPage(idx + 1)}
                className={`px-3 py-1 rounded ${
                  page === idx + 1 ? "bg-green-600 text-white" : "bg-gray-200"
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
                  ? "bg-gray-200 text-gray-400"
                  : "bg-green-600 text-white"
              }`}
            >
              {">"}
            </button>
          </div>
        )}
      </section>

      <CategoryModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        initialData={editing}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </main>
  );
};

export default AdminCategories;


