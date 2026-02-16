import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import branchApi from "@/api/branchApi";

const AdBranchDishes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);

  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, available, unavailable
  const [filteredDishes, setFilteredDishes] = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);

  // Fetch branch detail and dishes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch branch info
        const branchRes = await branchApi.getById(id);
        setBranch(branchRes.data);

        // Fetch dishes with status
        const dishesRes = await branchApi.getBranchDishes(id);
        setDishes(dishesRes.data);
        console.log("Fetched dishes with status:", dishesRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // Filter dishes
  useEffect(() => {
    const applyFilters = () => {
      setFilterLoading(true);
      setTimeout(() => {
        let result = [...dishes];

        // Filter by search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          result = result.filter((dish) =>
            dish.name.toLowerCase().includes(term)
          );
        }

        // Filter by status
        if (filterStatus === "available") {
          result = result.filter((dish) => dish.isAvailableAtBranch);
        } else if (filterStatus === "unavailable") {
          result = result.filter((dish) => !dish.isAvailableAtBranch);
        }

        setFilteredDishes(result);
        setFilterLoading(false);
      }, 200);
    };

    applyFilters();
  }, [searchTerm, filterStatus, dishes]);

  // Toggle dish status
  const handleToggleStatus = async (dishId, currentStatus) => {
    try {
      await branchApi.updateDishStatus(accessToken, id, dishId, !currentStatus);

      // Update local state
      setDishes((prev) =>
        prev.map((dish) =>
          dish._id === dishId
            ? { ...dish, isAvailableAtBranch: !currentStatus }
            : dish
        )
      );

      toast.success(
        `Đã ${!currentStatus ? "bật" : "tắt"} món ăn tại chi nhánh này`
      );
    } catch (error) {
      console.error("Error updating dish status:", error);
      toast.error("Lỗi cập nhật trạng thái món ăn");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-gray-50 min-h-screen p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Quản lý món ăn - {branch?.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Bật/tắt tình trạng sẵn có của món ăn tại chi nhánh này
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/branches")}
            className="cursor-pointer"
          >
            ← Quay lại
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tìm kiếm món ăn
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nhập tên món ăn..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Lọc theo trạng thái
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="available">Còn hàng</option>
              <option value="unavailable">Hết hàng</option>
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          {filterLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Đang lọc...</span>
            </>
          ) : (
            <span>
              Hiển thị {filteredDishes.length} / {dishes.length} món ăn
            </span>
          )}
        </div>
      </div>

      {/* Dishes Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Hình ảnh
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Tên món
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDishes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <p className="text-gray-500">Không tìm thấy món ăn nào</p>
                  </td>
                </tr>
              ) : (
                filteredDishes.map((dish, index) => (
                  <tr key={dish._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={
                          dish.imageUrls[dish.defaultImageIndex] ||
                          "/placeholder-dish.png"
                        }
                        alt={dish.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{dish.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {dish.category?.name || dish.category || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {dish.price?.toLocaleString("vi-VN")}đ
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={dish.isAvailableAtBranch}
                          onCheckedChange={() =>
                            handleToggleStatus(
                              dish._id,
                              dish.isAvailableAtBranch
                            )
                          }
                          className="data-[state=checked]:bg-green-600"
                        />
                        <span
                          className={`text-sm font-medium ${
                            dish.isAvailableAtBranch
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {dish.isAvailableAtBranch ? "Còn hàng" : "Hết hàng"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default AdBranchDishes;
