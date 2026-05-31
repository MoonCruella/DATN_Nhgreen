import React from "react";

const BranchListPanel = ({
  appliedProvince,
  loading,
  error,
  filteredBranches,
  activeBranch,
  onSelectBranch,
}) => {
  return (
    <div className="relative rounded-xl overflow-hidden shadow bg-white border">
      <div className="absolute inset-0 opacity-90 bg-[url('/src/assets/street.png')] bg-cover" />
      <div className="relative">
        <div className="w-full flex items-center justify-between px-5 py-5 backdrop-blur-sm bg-black/40 text-white">
          <span className="font-semibold text-lg md:text-xl">
            {appliedProvince?.name || "Chọn tỉnh/thành"}
          </span>
        </div>
        <div className="p-5 space-y-5">
          {loading && <p className="text-sm text-gray-100">Đang tải...</p>}
          {error && <p className="text-sm text-red-200">{error}</p>}
          {!loading &&
            !error &&
            (appliedProvince ? (
              filteredBranches.length === 0 ? (
                <p className="text-base text-gray-100">
                  Không có chi nhánh trong tỉnh này.
                </p>
              ) : null
            ) : (
              <p className="text-base text-gray-100">
                Vui lòng chọn tỉnh/quận và bấm TÌM KIẾM.
              </p>
            ))}
          {filteredBranches.map((b) => {
            const isActive = activeBranch?._id === b._id;
            return (
              <div
                key={b._id}
                onClick={() => onSelectBranch(b)}
                className={`group cursor-pointer rounded-lg px-5 py-4 border backdrop-blur-sm bg-black/35 text-white transition relative overflow-hidden ${
                  isActive
                    ? "border-green-400 shadow-lg"
                    : "border-white/20 hover:border-green-300"
                }`}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white transition" />
                <h3 className="font-semibold text-base md:text-lg flex items-center gap-2">
                  {b.code ? (
                    <span className="text-yellow-300 font-mono">{b.code}</span>
                  ) : null}
                  <span>{b.name}</span>
                </h3>
                <p className="text-sm mt-2 flex items-start gap-1 leading-relaxed">
                  <span className="opacity-80">📍</span>
                  <span>
                    {b.address?.full_address ||
                      [
                        b.address?.street,
                        b.address?.ward?.name,
                        b.address?.district?.name,
                        b.address?.province?.name,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                  </span>
                </p>
                {b.phone && (
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <span className="opacity-80">📞</span>
                    <span>{b.phone}</span>
                  </p>
                )}
                {b.opening_hours && (
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <span className="opacity-80">⏰</span>
                    <span>{b.opening_hours}</span>
                  </p>
                )}
                {isActive && (
                  <span className="absolute top-2 right-2 text-[11px] bg-green-500 text-white px-2 py-0.5 rounded-full">
                    Đang xem
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BranchListPanel;
