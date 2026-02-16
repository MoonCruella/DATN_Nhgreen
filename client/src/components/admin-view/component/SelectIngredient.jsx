import React, { useEffect, useState } from "react";
import ingredientApi from "@/api/ingredientApi";
import { useSelector } from "react-redux";
import { assets } from "@/assets/assets";

const PAGE_SIZE = 10;

function PickerPanel({
  openIndex,
  onClose,
  onSelect,
  onUpdateQuantity,
  fullWidth,
}) {
  const { accessToken } = useSelector((s) => s.auth || {});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!openIndex && openIndex !== 0) return;
    setSearch("");
    setPage(1);
    setSelected(null);
  }, [openIndex]);
  const loadPage = async (p, q) => {
    setLoading(true);
    try {
      const params = { page: p, limit: PAGE_SIZE, name: q || search };
      const res = await ingredientApi.getAll(accessToken, params);
      const items = res?.data || [];
      const pagination = res?.pagination || {};
      setIngredients(items);
      setTotal(pagination.totalItems || (items ? items.length : 0));
      if (pagination.currentPage) setPage(pagination.currentPage);
    } catch (err) {
      console.warn("Failed to load ingredients", err);
      setIngredients([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // reload when page or search changes
  useEffect(() => {
    if (openIndex || openIndex === 0) {
      loadPage(page, search);
    }
  }, [page, search, openIndex]);

  const handleSearch = (val) => {
    // update search and reset to first page; effect will load
    setSearch(val);
    setPage(1);
  };

  const pages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));

  if (!(openIndex || openIndex === 0)) return null;

  return (
    <div
      className={`${
        fullWidth
          ? "relative w-full max-w-6xl"
          : "absolute z-50 mt-2 w-[90vw] max-w-6xl"
      } bg-white border rounded shadow max-h-[60vh] overflow-hidden`}
    >
      <div className="grid grid-cols-2 gap-4 p-3">
        <div className="border-r pr-3">
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Tìm kiếm nguyên liệu..."
            className="w-full border rounded px-3 py-2 mb-3"
          />
          <div className="space-y-2 max-h-[44vh] overflow-auto">
            {loading ? (
              <div className="text-sm text-gray-500">Đang tải...</div>
            ) : ingredients.length === 0 ? (
              <div className="text-sm text-gray-500">
                Không tìm thấy nguyên liệu
              </div>
            ) : (
              ingredients.map((it) => (
                <button
                  key={it._id}
                  type="button"
                  onClick={() => {
                    setSelected(it);
                    onSelect && onSelect(it);
                  }}
                  className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 text-left rounded"
                >
                  {it.imageUrl ? (
                    <img
                      src={it.imageUrl}
                      alt={it.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                  )}
                  <div className="flex-1 min-w-0 truncate max-w-[220px]">
                    {it.name}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-gray-600">{total} kết quả</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
                type="button"
              >
                Trước
              </button>
              <div className="text-sm">
                {page}/{pages}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
                type="button"
              >
                Sau
              </button>
            </div>
          </div>
        </div>

        <div className="pl-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Đã chọn</div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                onClose && onClose();
              }}
              className="px-2 py-1 text-sm text-gray-600"
            >
              Đóng
            </button>
          </div>

          {!selected ? (
            <div className="text-sm text-gray-500">
              Chưa chọn nguyên liệu nào — nhấn vào bên trái để chọn.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {selected.imageUrl ? (
                  <img
                    src={selected.imageUrl}
                    alt={selected.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate max-w-[220px]">
                    {selected.name}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Số gram</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={""}
                    onChange={(e) =>
                      onUpdateQuantity && onUpdateQuantity(e.target.value)
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                  <div className="text-sm text-gray-600">g</div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose && onClose();
                  }}
                  className="px-3 py-1 bg-gray-100 rounded"
                >
                  Xong
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SelectIngredient(props) {
  // If formIngredients prop exists, render the full ingredient list UI (previously IngredientList.jsx)
  const {
    formIngredients,
    ingredientsList = [],
    addIngredient,
    updateIngredient,
    removeIngredient,
    openIndex,
    onClose,
    onSelect,
    onUpdateQuantity,
    index,
    fullWidth = false,
  } = props;

  if (Array.isArray(formIngredients)) {
    // two-column layout: left = searchable paginated ingredient list, right = selected ingredients
    const { accessToken } = useSelector((s) => s.auth || {});
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [ingredients, setIngredients] = useState([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
      // initialize to first page
      setSearch("");
      setPage(1);
    }, []);

    const loadPage = async (p, q) => {
      setLoading(true);
      try {
        const token = accessToken || null;
        const params = { page: p, limit: PAGE_SIZE, name: q || search };
        const res = await ingredientApi.getAll(token, params);
        const items = res?.data || [];
        const pagination = res?.pagination || {};
        setIngredients(items);
        setTotal(pagination.totalItems || (items ? items.length : 0));
        if (pagination.currentPage) setPage(pagination.currentPage);
        // total pages derived by caller if needed
      } catch (err) {
        console.warn("Failed to load ingredients", err);
        setIngredients([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    // reload when page or search changes
    useEffect(() => {
      loadPage(page, search);
    }, [page, search]);

    const handleSearch = (val) => {
      // update search and reset page; effect will load
      setSearch(val);
      setPage(1);
    };

    const pages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));

    const handleClickLeft = (it) => {
      // if already selected, increment quantity by 1
      const foundIdx = (formIngredients || []).findIndex(
        (f) => f.ingredient === it._id
      );
      if (foundIdx >= 0) {
        const cur = Number(formIngredients[foundIdx].quantityGram) || 0;
        updateIngredient(foundIdx, { quantityGram: String(cur + 1) });
        return;
      }
      // otherwise append and set ingredient
      const nextIdx = (formIngredients || []).length;
      // call addIngredient to keep parent state consistent
      addIngredient && addIngredient();
      // set the newly added entry
      updateIngredient(nextIdx, { ingredient: it._id, quantityGram: "100" });
    };

    return (
      <div
        className={`${
          fullWidth ? "w-full max-w-6xl" : "w-full"
        } grid grid-cols-[3fr_2fr] gap-4`}
      >
        <div className="border-r pr-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Danh sách nguyên liệu</div>
          </div>
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Tìm kiếm nguyên liệu..."
            className="w-full border rounded px-3 py-2 mb-3"
          />

          <div className="space-y-2 max-h-[56vh] overflow-auto">
            {loading ? (
              <div className="text-sm text-gray-500">Đang tải...</div>
            ) : ingredients.length === 0 ? (
              <div className="text-sm text-gray-500">
                Không tìm thấy nguyên liệu
              </div>
            ) : (
              ingredients.map((it) => {
                const already = (formIngredients || []).some(
                  (f) => f.ingredient === it._id
                );
                return (
                  <div
                    key={it._id}
                    className={`w-full flex items-center gap-3 px-2 py-2 rounded ${
                      already ? "bg-green-50" : "hover:bg-gray-50"
                    }`}
                  >
                    {it.imageUrl ? (
                      <img
                        src={it.imageUrl}
                        alt={it.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium max-w-[220px]">
                        {it.name}
                      </div>
                    </div>
                    <div>
                      {already ? (
                        <div></div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleClickLeft(it)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-sm transform transition hover:scale-105 hover:shadow-md"
                        >
                          Chọn
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-gray-600">{total} kết quả</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
                type="button"
              >
                Trước
              </button>
              <div className="text-sm">
                {page}/{pages}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
                type="button"
              >
                Sau
              </button>
            </div>
          </div>
        </div>

        <div className="pl-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Nguyên liệu đã chọn</div>
            <div className="text-sm text-gray-500">
              {(formIngredients || []).length} items
            </div>
          </div>

          <div className="space-y-3 max-h-[56vh] overflow-auto">
            {(formIngredients || []).map((ing, idx) => {
              const sel = ingredientsList.find(
                (it) => it._id === (ing.ingredient || "")
              );
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 border rounded p-2"
                >
                  {sel && sel.imageUrl ? (
                    <img
                      src={sel.imageUrl}
                      alt={sel.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate max-w-[220px]">
                      {sel?.name || "(chưa chọn)"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = Number(ing.quantityGram) || 0;
                        updateIngredient(idx, {
                          quantityGram: String(Math.max(0, cur - 1)),
                        });
                      }}
                      className="px-2 py-1 bg-gray-100 rounded"
                    >
                      -
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={ing.quantityGram}
                      onChange={(e) =>
                        updateIngredient(idx, { quantityGram: e.target.value })
                      }
                      className="w-20 border rounded px-2 py-1 text-center"
                    />
                    <div className="text-sm text-gray-600">(g)</div>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = Number(ing.quantityGram) || 0;
                        updateIngredient(idx, {
                          quantityGram: String(cur + 1),
                        });
                      }}
                      className="px-2 py-1 bg-gray-100 rounded"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeIngredient(idx)}
                      className="px-1 py-1 bg-pink-100 rounded transform transition hover:scale-105 hover:shadow-md"
                      title="Xóa"
                      aria-label="Xóa"
                    >
                      <img src={assets.xIcon} alt="Xóa" className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise behave as the legacy picker panel
  return (
    <PickerPanel
      openIndex={openIndex}
      onClose={onClose}
      onSelect={onSelect}
      onUpdateQuantity={onUpdateQuantity}
      index={index}
      fullWidth={fullWidth}
    />
  );
}
