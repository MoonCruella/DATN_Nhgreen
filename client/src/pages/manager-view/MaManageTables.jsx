import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Edit3, ExternalLink, Plus, QrCode, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import branchApi from "@/api/branchApi";
import orderApi from "@/api/orderApi";
import storeTableApi from "@/api/storeTableApi";
import { assets } from "@/assets/assets";
import CreateOrderModal from "@/components/manager-view/modals/CreateOrderModal";
import TableFormModal from "@/components/manager-view/modals/TableFormModal";
import TableUpdateModal from "@/components/manager-view/modals/TableUpdateModal";

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const getTableTotal = (table) => table.current_total || table.total_amount || 0;

const hasTableActivity = (table) =>
  Boolean(
    table.has_active_session ||
    table.active_session ||
    table.current_order_id ||
    table.last_order_id ||
    getTableTotal(table) > 0,
  );

const TableCard = ({
  table,
  index,
  onCreateOrder,
  onDetailClick,
  onEditTable,
  onQrClick,
}) => {
  const [qrFailed, setQrFailed] = useState(false);
  const qrImage = table.qr_code_data_url;
  const hasActivity = hasTableActivity(table);
  const totalAmount = getTableTotal(table);

  return (
    <article className="relative min-h-[200px] overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-gray-100">
      <div
        className={`absolute left-1/2 top-0 z-10 h-9 min-w-[190px] -translate-x-1/2 rounded-b-[26px] px-6 text-center text-lg font-bold leading-9 text-white shadow-sm ${
          table.active ? "bg-[#26338d]" : "bg-gray-500"
        }`}
      >
        <span className="block truncate">
          {table.name || `Bàn ${index + 1}`}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onEditTable(table)}
        className="absolute left-3 top-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50 text-gray-400 transition hover:bg-blue-50 hover:text-[#26338d]"
        title="Cập nhật bàn"
      >
        <Edit3 className="h-5 w-5" strokeWidth={1.8} />
      </button>

      <button
        type="button"
        onClick={() => onQrClick(table)}
        className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-md bg-gray-50 p-1 transition hover:bg-cyan-50"
        title="Xem mã QR"
      >
        {qrFailed || !qrImage ? (
          <QrCode className="h-8 w-8 text-gray-700" />
        ) : (
          <img
            src={qrImage}
            alt={`QR ${table.name}`}
            className="h-full w-full rounded object-contain"
            onError={() => setQrFailed(true)}
          />
        )}
      </button>

      <div className="flex h-full flex-col justify-end px-5 pb-5 pt-16 sm:px-7">
        <img
          src={assets.add_icon}
          alt={table.name}
          className="mx-auto mb-3 h-14 w-14 rounded-full object-cover"
        />

        {hasActivity && (
          <div className="mb-4 text-center text-base font-bold text-gray-800 sm:text-lg">
            Tổng hóa đơn:{" "}
            <span className="text-[#26338d]">
              {formatCurrency(totalAmount)} VND
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {hasActivity ? (
            <button
              type="button"
              onClick={() => onDetailClick(table)}
              className="flex h-12 items-center justify-center gap-3 rounded-lg border border-[#26338d] text-lg font-bold text-[#26338d] transition hover:bg-blue-50"
            >
              <ExternalLink className="h-5 w-5" />
              Chi tiết
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onCreateOrder(table)}
              className="flex h-12 items-center justify-center gap-3 rounded-lg border border-[#26338d] text-lg font-bold text-[#26338d] transition hover:bg-blue-50"
            >
              <Plus className="h-6 w-6" />
              Tạo đơn
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

const TableQrModal = ({ table, onClose }) => {
  if (!table) return null;

  const qrValue = table.qr_url || table.qr_token || table._id;
  const qrImage = table.qr_code_data_url;

  const copyQr = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      toast.success("Đã sao chép link QR");
    } catch {
      toast.error("Không thể sao chép link QR");
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white px-7 py-8 text-center shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-slate-800 hover:bg-gray-100"
          title="Đóng"
        >
          <X className="h-6 w-6" />
        </button>

        <h3 className="text-2xl font-black text-gray-900">
          {table.name || "Bàn"}
        </h3>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Quét mã QR để mở E-menu và gọi món tại bàn
        </p>

        <div className="mx-auto mt-7 flex h-72 w-72 items-center justify-center rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          {qrImage ? (
            <img
              src={qrImage}
              alt={`QR ${table.name}`}
              className="h-full w-full object-contain"
            />
          ) : (
            <QrCode className="h-40 w-40 text-gray-700" />
          )}
        </div>

        <div className="mt-5 break-all rounded-lg bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600">
          {qrValue}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={copyQr}
            className="h-11 rounded-lg border-[#26338d] text-sm font-bold text-[#26338d]"
          >
            Sao chép link
          </Button>
          <Button
            type="button"
            onClick={() => window.open(qrValue, "_blank", "noopener,noreferrer")}
            className="h-11 rounded-lg bg-[#26338d] text-sm font-bold text-white hover:bg-[#1d2874]"
          >
            Mở E-menu
          </Button>
        </div>
      </div>
    </div>
  );
};

const CreateTableCard = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="relative min-h-[200px] overflow-hidden rounded-lg bg-white text-gray-400 shadow-sm ring-1 ring-gray-100 transition hover:text-cyan-500 hover:shadow-md"
  >
    <div className="absolute left-1/2 top-0 h-9 min-w-[190px] -translate-x-1/2 rounded-b-[26px] bg-gray-600 px-6 text-center text-lg font-bold leading-9 text-white">
      Bàn
    </div>
    <div className="flex h-full flex-col items-center justify-end px-5 pb-5 pt-16 sm:px-7">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-dashed border-gray-400">
        <Plus className="h-7 w-7" />
      </div>
      <div className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 text-lg font-bold">
        <Plus className="h-5 w-5" />
        Tạo bàn
      </div>
    </div>
  </button>
);

const MaManageTables = () => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const user = useSelector((state) => state.auth.user);
  const branchId = user?.branch_id;

  const [branch, setBranch] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status] = useState("active");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrderTable, setSelectedOrderTable] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [editingTable, setEditingTable] = useState(null);
  const [qrTable, setQrTable] = useState(null);

  const fetchTables = async () => {
    if (!accessToken || !branchId) return;

    try {
      setLoading(true);
      const [branchRes, tableRes] = await Promise.all([
        branchApi.getById(branchId),
        storeTableApi.getAll(accessToken, {
          branch_id: branchId,
          active: status === "all" ? undefined : status,
          q: search || undefined,
          limit: 100,
        }),
      ]);
      setBranch(branchRes.data);
      setTables(tableRes?.data?.tables || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Không thể tải danh sách bàn",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [accessToken, branchId, status]);

  const handleCreate = async (payload) => {
    try {
      await storeTableApi.create(accessToken, payload);
      toast.success("Đã tạo bàn");
      setShowCreate(false);
      fetchTables();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể tạo bàn");
    }
  };

  const handleUpdate = async (table, payload) => {
    try {
      await storeTableApi.update(accessToken, table._id, payload);
      toast.success("Đã cập nhật bàn");
      setEditingTable(null);
      fetchTables();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể cập nhật bàn");
    }
  };

  const handleDelete = async (table) => {
    const confirmed = window.confirm(
      `Xóa ${table.name || "bàn này"}? Mã QR của bàn này cũng sẽ không còn sử dụng được.`,
    );

    if (!confirmed) return;

    try {
      await storeTableApi.remove(accessToken, table._id);
      toast.success("Đã xóa bàn");
      setEditingTable(null);
      fetchTables();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể xóa bàn");
    }
  };

  const handleDetailClick = async (table) => {
    try {
      setSelectedOrderTable(table);
      setCurrentOrder(null);

      // Fetch all processing orders từ branch
      const response = await orderApi.getOrdersByBranch(accessToken, branchId, {
        status: "processing",
        order_type: "dine_in",
        limit: 100,
      });

      const orders = response?.data?.orders || [];
      // Filter để tìm order thuộc về bàn này
      const tableOrder = orders.find(
        (order) =>
          order.table_id === table._id ||
          order.table_id?._id === table._id ||
          order.table_info?._id === table._id,
      );

      if (tableOrder) {
        setCurrentOrder(tableOrder);
      } else {
        toast.info("Không tìm thấy đơn hàng đang xử lý cho bàn này");
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error(error?.response?.data?.message || "Không thể tải đơn hàng");
    }
  };

  const filteredTables = tables.filter((table) => {
    if (!search.trim()) return true;
    const value = search.trim().toLowerCase();
    return (
      table.name?.toLowerCase().includes(value) ||
      table.code?.toLowerCase().includes(value)
    );
  });

  return (
    <section className="min-h-[calc(100vh-92px)] bg-gray-50 px-2 py-2">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sơ đồ bàn QR</h2>
          <p className="mt-1 text-sm font-medium text-gray-500">
            {branch?.name || "Chi nhánh"} · {filteredTables.length} bàn
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") fetchTables();
              }}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 outline-none focus:border-cyan-400 sm:w-72"
              placeholder="Tìm bàn hoặc mã bàn"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[200px] animate-pulse rounded-lg bg-white shadow-sm"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredTables.map((table, index) => (
            <TableCard
              key={table._id}
              table={table}
              index={index}
              onCreateOrder={(table) => {
                setSelectedOrderTable(table);
                setCurrentOrder(null);
              }}
              onDetailClick={handleDetailClick}
              onEditTable={setEditingTable}
              onQrClick={setQrTable}
            />
          ))}
          <CreateTableCard onClick={() => setShowCreate(true)} />
        </div>
      )}

      <TableFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        branchId={branchId}
      />
      <TableUpdateModal
        table={editingTable}
        onClose={() => setEditingTable(null)}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
      <CreateOrderModal
        table={selectedOrderTable}
        branchId={branchId}
        accessToken={accessToken}
        onOrderCreated={fetchTables}
        onClose={() => {
          setSelectedOrderTable(null);
          setCurrentOrder(null);
        }}
        initialOrder={currentOrder}
      />
      <TableQrModal table={qrTable} onClose={() => setQrTable(null)} />
    </section>
  );
};

export default MaManageTables;
