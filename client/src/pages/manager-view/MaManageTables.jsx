import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { toast } from "sonner";
import {
  ConciergeBell,
  Edit3,
  ExternalLink,
  Plus,
  QrCode,
  Search,
  ArrowRightLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import branchApi from "@/api/branchApi";
import orderApi from "@/api/orderApi";
import storeTableApi from "@/api/storeTableApi";
import { assets } from "@/assets/assets";
import CreateOrderModal from "@/components/manager-view/modals/CreateOrderModal";
import TableFormModal from "@/components/manager-view/modals/TableFormModal";
import TableUpdateModal from "@/components/manager-view/modals/TableUpdateModal";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL;

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const getTableTotal = (table) => table.current_total || table.total_amount || 0;

const getTableItemCount = (table) => {
  if (typeof table.current_item_count === "number") {
    return table.current_item_count;
  }

  const items = table.current_order?.items || table.items || [];
  return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
};

const hasTableActivity = (table) =>
  Boolean(
    table.has_current_order ||
    table.has_active_session ||
    table.active_session ||
    table.current_order_id ||
    getTableTotal(table) > 0,
  );

const TableCard = ({
  table,
  index,
  onCreateOrder,
  onDetailClick,
  onTransferTable,
  onEditTable,
  onQrClick,
}) => {
  const [qrFailed, setQrFailed] = useState(false);
  const qrImage = table.qr_code_data_url;
  const hasActivity = hasTableActivity(table);
  const totalAmount = getTableTotal(table);
  const itemCount = getTableItemCount(table);

  return (
    <article className="relative h-[220px] overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-gray-100">
      <div
        className="absolute left-1/2 top-0 z-10 h-9 min-w-[190px] -translate-x-1/2 rounded-b-[26px] bg-[#34ad54] px-6 text-center text-lg font-bold leading-9 text-white shadow-sm"
      >
        <span className="block truncate">
          {table.name || `Bàn ${index + 1}`}
        </span>
      </div>

      {hasActivity && (
        <div className="absolute left-3 top-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50">
          <ConciergeBell className="h-8 w-8 text-[#34ad54]" strokeWidth={1.8} />
          <span className="absolute -right-1 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-black leading-none text-white">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => onEditTable(table)}
        className={`absolute left-3 top-3 h-12 w-12 items-center justify-center rounded-lg bg-gray-50 text-gray-400 transition hover:bg-green-50 hover:text-[#34ad54] ${
          hasActivity ? "hidden" : "flex"
        }`}
        title="Cập nhật bàn"
      >
        <Edit3 className="h-5 w-5" strokeWidth={1.8} />
      </button>

      <button
        type="button"
        onClick={() => onQrClick(table)}
        className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-md bg-gray-50 p-1 transition hover:bg-green-50"
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

      <div className="flex h-full flex-col justify-end px-5 pb-6 pt-20 sm:px-7">
        {hasActivity && (
          <div className="mb-8 text-center text-lg font-bold text-gray-800">
            Tổng hóa đơn:{" "}
            <span className="text-xl text-[#34ad54]">
              {formatCurrency(totalAmount)} VND
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {hasActivity ? (
            <>
            <button
              type="button"
              onClick={() => onDetailClick(table)}
              className="flex h-12 items-center justify-center gap-3 rounded-lg border border-[#34ad54] text-base font-bold text-[#34ad54] transition hover:bg-green-50"
            >
              <ExternalLink className="h-5 w-5" />
              Chi tiết
            </button>
            <button
              type="button"
              onClick={() => onTransferTable(table)}
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-sky-500 text-base font-bold text-sky-600 transition hover:bg-sky-50"
            >
              <ArrowRightLeft className="h-5 w-5" />
              Chuyển
            </button>
            </>
          ) : (
            <div className="col-span-2 w-full text-center">
              <img
                src={assets.add_icon}
                alt={table.name}
                className="mx-auto mb-3 h-14 w-14 rounded-full object-cover"
              />
              <button
                type="button"
                onClick={() => onCreateOrder(table)}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#34ad54] text-base font-bold text-[#34ad54] transition hover:bg-green-50"
              >
                <Plus className="h-6 w-6" />
                Tạo đơn
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

const TableQrModal = ({ table, onClose }) => {
  if (!table) return null;

  const qrImage = table.qr_code_data_url;
  const tableName = table.name || "Bàn";

  const handlePrintQr = () => {
    if (!qrImage) {
      toast.error("Chưa có mã QR để in");
      return;
    }

    const printWindow = window.open("", "_blank", "width=520,height=680");
    if (!printWindow) {
      toast.error("Trình duyệt đã chặn cửa sổ in");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>In QR ${tableName}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }
            .sheet {
              width: 360px;
              text-align: center;
              padding: 24px;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 24px;
              font-weight: 800;
            }
            p {
              margin: 0 0 20px;
              font-size: 14px;
              color: #6b7280;
              font-weight: 600;
            }
            img {
              width: 280px;
              height: 280px;
              object-fit: contain;
            }
            @media print {
              body { min-height: auto; }
              .sheet { border: 0; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <h1>${tableName}</h1>
            <p>Quét mã QR để mở E-menu và gọi món tại bàn</p>
            <img src="${qrImage}" alt="QR ${tableName}" />
          </div>
          <script>
            window.onload = () => {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

        <Button
          type="button"
          onClick={handlePrintQr}
          className="mt-5 h-11 w-full rounded-lg bg-[#34ad54] text-sm font-bold text-white hover:bg-[#2f9b45]"
        >
          In QR
        </Button>
      </div>
    </div>
  );
};

const TransferTableModal = ({
  open,
  sourceTable,
  emptyTables = [],
  submitting = false,
  onClose,
  onSubmit,
}) => {
  const [targetTableId, setTargetTableId] = useState("");

  useEffect(() => {
    if (open) setTargetTableId("");
  }, [open]);

  if (!open || !sourceTable) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 px-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white px-7 py-7 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute right-4 top-4 rounded-md p-1 text-slate-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          title="Đóng"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <ArrowRightLeft className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Chuyển bàn</h3>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Chuyển toàn bộ hóa đơn và phiên E-menu sang bàn trống.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-sm font-semibold text-gray-500">Bàn hiện tại</div>
          <div className="mt-1 text-lg font-bold text-gray-900">
            {sourceTable.name || "Bàn"}
          </div>
        </div>

        <label className="mt-5 block text-sm font-bold text-gray-700">
          Chọn bàn chuyển đến
          <select
            value={targetTableId}
            onChange={(event) => setTargetTableId(event.target.value)}
            disabled={submitting || emptyTables.length === 0}
            className="mt-2 h-12 w-full rounded-lg border border-gray-200 bg-white px-4 text-base font-semibold text-gray-900 outline-none focus:border-[#34ad54] disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="">Chọn bàn trống</option>
            {emptyTables.map((table) => (
              <option key={table._id} value={table._id}>
                {table.name || "Bàn"}
              </option>
            ))}
          </select>
        </label>

        {emptyTables.length === 0 && (
          <p className="mt-3 text-sm font-medium text-red-600">
            Hiện không có bàn trống để chuyển.
          </p>
        )}

        <div className="mt-7 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="h-11 rounded-lg px-5 font-bold"
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit?.(targetTableId)}
            disabled={submitting || !targetTableId}
            className="h-11 rounded-lg bg-[#34ad54] px-5 font-bold text-white hover:bg-[#2f9b45] disabled:cursor-not-allowed disabled:bg-[#bbf7d0]"
          >
            {submitting ? "Đang chuyển..." : "Xác nhận chuyển"}
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
    className="relative h-[220px] overflow-hidden rounded-lg bg-white text-gray-400 shadow-sm ring-1 ring-gray-100 transition hover:text-green-600 hover:shadow-md"
  >
    <div className="absolute left-1/2 top-0 h-9 min-w-[190px] -translate-x-1/2 rounded-b-[26px] bg-gray-600 px-6 text-center text-lg font-bold leading-9 text-white">
      Bàn
    </div>
    <div className="flex h-full flex-col items-center justify-end px-5 pb-5 pt-16 sm:px-7">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-dashed border-gray-400">
        <Plus className="h-7 w-7" />
      </div>
      <div className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 text-base font-bold">
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
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrderTable, setSelectedOrderTable] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [editingTable, setEditingTable] = useState(null);
  const [qrTable, setQrTable] = useState(null);
  const [transferSourceTable, setTransferSourceTable] = useState(null);
  const [transferring, setTransferring] = useState(false);

  const fetchTables = useCallback(async ({ silent = false } = {}) => {
    if (!accessToken || !branchId) return;

    try {
      if (!silent) setLoading(true);
      const [branchRes, tableRes] = await Promise.all([
        branchApi.getById(branchId),
        storeTableApi.getAll(accessToken, {
          branch_id: branchId,
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
      if (!silent) setLoading(false);
    }
  }, [accessToken, branchId]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (!accessToken || !branchId || !SOCKET_URL) return undefined;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });

    const refreshTables = () => {
      fetchTables({ silent: true });
    };

    socket.on("connect", () => {
      socket.emit("join_branch_room", branchId);
    });
    socket.on("new_order", refreshTables);
    socket.on("order_status_updated", refreshTables);
    socket.on("dine_in_order_paid", refreshTables);
    socket.on("order_completed", refreshTables);
    socket.on("order_cancelled", refreshTables);
    socket.on("table_transferred", refreshTables);

    return () => {
      socket.emit("leave_branch_room", branchId);
      socket.disconnect();
    };
  }, [accessToken, branchId, fetchTables]);

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

  const handleOpenTransferTable = (table) => {
    if (!table?.has_current_order && !table?.current_order_id) {
      toast.error("Bàn hiện tại chưa có hóa đơn để chuyển");
      return;
    }

    setTransferSourceTable(table);
  };

  const handleTransferTable = async (targetTableId) => {
    if (!transferSourceTable?._id || !targetTableId) return;

    try {
      setTransferring(true);
      await storeTableApi.transferOrder(
        accessToken,
        transferSourceTable._id,
        targetTableId,
      );
      toast.success("Đã chuyển bàn thành công");
      setTransferSourceTable(null);
      setSelectedOrderTable(null);
      setCurrentOrder(null);
      await fetchTables();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể chuyển bàn");
    } finally {
      setTransferring(false);
    }
  };

  const filteredTables = tables.filter((table) => {
    if (!search.trim()) return true;
    const value = search.trim().toLowerCase();
    return (
      table.name?.toLowerCase().includes(value)
    );
  });
  const emptyTransferTables = tables.filter(
    (table) =>
      table._id !== transferSourceTable?._id &&
      !hasTableActivity(table),
  );

  return (
    <section className="min-h-[calc(100vh-92px)] bg-gray-50 px-2 py-2">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sơ đồ bàn</h2>
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
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 outline-none focus:border-green-500 sm:w-72"
              placeholder="Tìm bàn hoặc mã bàn"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[220px] animate-pulse rounded-lg bg-white shadow-sm"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 2xl:grid-cols-3">
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
              onTransferTable={handleOpenTransferTable}
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
      <TransferTableModal
        open={Boolean(transferSourceTable)}
        sourceTable={transferSourceTable}
        emptyTables={emptyTransferTables}
        submitting={transferring}
        onClose={() => {
          if (!transferring) setTransferSourceTable(null);
        }}
        onSubmit={handleTransferTable}
      />
    </section>
  );
};

export default MaManageTables;


