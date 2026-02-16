import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import IngredientTable from "@/components/admin-view/tables/IngredientTable";
import IngredientModal from "@/components/admin-view/modals/IngredientModal";
import ingredientApi from "@/api/ingredientApi";

const AdminIngredients = () => {
  const [ingredients, setIngredients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [qName, setQName] = useState("");
  const [qStatus, setQStatus] = useState("");
  const [qType, setQType] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { user, isAuthenticated, accessToken } = useSelector((s) => s.auth);

  const loadIngredients = async (opts = {}) => {
    try {
      setIsLoading(true);

      // Theo pattern của branch: ưu tiên axiosPrivate với cookie, nhưng vẫn truyền token nếu có
      const token = accessToken || null;
      const params = {
        page,
        limit,
        name: qName,
        status: qStatus,
        type: qType,
        ...opts,
      };
      const res = await ingredientApi.getAll(token, params);

      // API trả về { success, data, pagination }
      const items = res?.data || [];
      const pagination = res?.pagination || {};
      setIngredients(items);
      console.log("Fetched ingredients:", items);
      setTotalPages(pagination.totalPages || 1);
      setTotalItems(pagination.totalItems || items.length);
    } catch (err) {
      console.error("Error loading ingredients", err);
      toast.error("Lỗi tải nguyên liệu");
    } finally {
      setIsLoading(false);
    }
  };

  // Load ingredients when auth, filters or page change (single effect)
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") return;
    loadIngredients();
  }, [isAuthenticated, user, qName, qStatus, qType, page]);

  const handleAdd = () => {
    setEditing(null);
    setIsOpen(true);
  };

  // Điều khiển chuyển trang: chỉ set page, effect sẽ load dữ liệu
  const handlePageChange = (p) => {
    setPage(p);
  };

  const handleRowClick = (it) => {
    setEditing(it);
    setIsOpen(true);
  };

  const handleSubmit = async (data) => {
    try {
      const token = accessToken || null;
      if (editing) {
        await ingredientApi.update(token, editing._id, data);
        toast.success("Cập nhật nguyên liệu thành công");
      } else {
        await ingredientApi.create(token, data);
        toast.success("Thêm nguyên liệu thành công");
      }
      setIsOpen(false);
      loadIngredients();
    } catch (err) {
      console.error("Ingredient save error", err);
      toast.error("Lưu nguyên liệu thất bại");
    }
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("Bạn có chắc muốn xóa nguyên liệu này?");
    if (!confirm) return;
    try {
      const token = accessToken || null;
      await ingredientApi.remove(token, id);
      toast.success("Xóa nguyên liệu thành công");
      setIsOpen(false);
      loadIngredients();
    } catch (err) {
      console.error("Delete ingredient error", err);
      toast.error("Xóa nguyên liệu thất bại");
    }
  };

  return (
    <main className="bg-gray-50 min-h-screen">
      <section className="w-full px-4 pt-8">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="text-lg font-medium">Quản lý nguyên liệu</div>
          <div className="flex items-center gap-5">
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
                <option value="available">Có sẵn</option>
                <option value="discontinued">Ngừng bán</option>
              </select>
              <select
                value={qType}
                onChange={(e) => {
                  setQType(e.target.value);
                  setPage(1);
                }}
                className="border rounded-lg px-3 py-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer"
              >
                <option value="">Tất cả loại</option>
                <option value="tinh_bot">Tinh bột</option>
                <option value="protein_dong_vat">Protein động vật</option>
                <option value="protein_thuc_vat">Protein thực vật</option>
                <option value="rau_cu_qua">Rau, củ, quả</option>
                <option value="trai_cay">Trái cây</option>
                <option value="do_uong">Đồ uống</option>
                <option value="do_ngot">Đồ ngọt</option>
              </select>
              {/* Search happens automatically while typing/selecting */}
              <button
                onClick={() => {
                  setQName("");
                  setQStatus("");
                  setQType("");
                  setPage(1);
                }}
                className="px-3 py-2 bg-gray-100 rounded-lg transition hover:bg-gray-200 cursor-pointer"
              >
                Đặt lại
              </button>
            </div>

            <div className="flex items-center">
              <button
                onClick={handleAdd}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg transition transform hover:scale-105 hover:bg-gray-700 active:scale-95 cursor-pointer"
              >
                + Thêm nguyên liệu
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 w-full px-4">
        <IngredientTable
          ingredients={ingredients}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          pageSize={limit}
        />

        {/* Footer showing counts */}
        <div className="mt-3 text-xs text-gray-600 flex items-center justify-between">
          <div>
            Hiển thị {ingredients.length} / {totalItems} nguyên liệu
          </div>
          <div>
            Trang {page} / {totalPages}
          </div>
        </div>
      </section>

      <IngredientModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        initialData={editing}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </main>
  );
};

export default AdminIngredients;
