import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import IngredientTable from "@/components/admin-view/tables/IngredientTable";
import IngredientModal from "@/components/admin-view/modals/IngredientModal";
import ingredientApi from "@/api/ingredientApi";
import { ChevronRight, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import FilterSelect from "@/components/common/FilterSelect";
import AdminPagination from "@/components/admin-view/AdminPagination";

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
  const [appliedStatus, setAppliedStatus] = useState("");
  const [appliedType, setAppliedType] = useState("");

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
        status: appliedStatus,
        type: appliedType,
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
  }, [isAuthenticated, user, qName, appliedStatus, appliedType, page]);

  const handleAdd = () => {
    setEditing(null);
    setIsOpen(true);
  };

  // Điều khiển chuyển trang: chỉ set page, effect sẽ load dữ liệu
  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
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

  const applyFilters = () => {
    setAppliedStatus(qStatus);
    setAppliedType(qType);
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(qName.trim()) ||
    Boolean(qStatus) ||
    Boolean(qType) ||
    Boolean(appliedStatus) ||
    Boolean(appliedType);

  return (
    <section className="min-h-[calc(100vh-92px)] bg-[#f7f7f8] px-3 py-3">
      <header className="mb-5 flex items-center gap-2 text-lg font-bold">
        <div className="flex items-center gap-2 text-gray-900">
          <Store className="h-5 w-5" strokeWidth={1.8} />
          Quản trị hệ thống
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500" />
        <div className="text-[#34ad54]">Kho nguyên liệu</div>
      </header>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center xl:flex-1">
          <div className="relative w-full lg:w-[300px]">
            <input
              type="text"
              placeholder="Tên nguyên liệu"
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
              { value: "available", label: "Có sẵn" },
              { value: "discontinued", label: "Ngừng bán" },
            ]}
            className="lg:w-[220px]"
          />

          <FilterSelect
            label="Loại"
            value={qType || "all"}
            onChange={(value) => {
              setQType(value === "all" ? "" : value);
            }}
            options={[
              { value: "all", label: "Tất cả loại" },
              { value: "tinh_bot", label: "Tinh bột" },
              { value: "protein_dong_vat", label: "Protein động vật" },
              { value: "protein_thuc_vat", label: "Protein thực vật" },
              { value: "rau_cu_qua", label: "Rau, củ, quả" },
              { value: "trai_cay", label: "Trái cây" },
              { value: "do_uong", label: "Đồ uống" },
              { value: "do_ngot", label: "Đồ ngọt" },
            ]}
            className="lg:w-[220px]"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setQName("");
                setQStatus("");
                setQType("");
                setAppliedStatus("");
                setAppliedType("");
                setPage(1);
              }}
              className="whitespace-nowrap text-base font-bold text-[#34ad54] underline underline-offset-4 hover:text-[#2f9b45]"
            >
              Chọn mặc định
            </button>
          )}

          <Button
            type="button"
            onClick={applyFilters}
            className="h-12 min-w-[110px] rounded-lg bg-[#34ad54] text-base font-bold text-white hover:bg-[#2f9b45] lg:ml-auto"
          >
            Áp dụng
          </Button>
        </div>

        <Button
          type="button"
          onClick={handleAdd}
          className="h-12 rounded-lg bg-[#34ad54] px-5 text-base font-bold text-white hover:bg-[#2f9b45]"
        >
          + Thêm nguyên liệu
        </Button>
      </div>

      <section className="pb-16 w-full">
        <IngredientTable
          ingredients={ingredients}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          page={page}
          pageSize={limit}
        />

        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={limit}
          itemLabel="nguyên liệu"
          onPageChange={handlePageChange}
        />
      </section>

      <IngredientModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        initialData={editing}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </section>
  );
};

export default AdminIngredients;


