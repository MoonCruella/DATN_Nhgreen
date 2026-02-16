import React from "react";
import GoongMap from "@/components/common/GoongMap";

const BranchMapPanel = ({ activeBranch, mapIframeUrl, appliedProvince }) => {
  return (
    <div className="rounded-xl border shadow bg-white overflow-hidden h-[500px] md:h-[700px] flex flex-col">
      {activeBranch && mapIframeUrl ? (
        <>
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <span className="text-green-600">📌</span>
                {activeBranch.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {activeBranch.address?.full_address ||
                  [
                    activeBranch.address?.street,
                    activeBranch.address?.ward?.name,
                    activeBranch.address?.district?.name,
                    activeBranch.address?.province?.name,
                  ]
                    .filter(Boolean)
                    .join(", ")}
              </p>
            </div>
          </div>
          <div className="flex-1">
            {import.meta.env.VITE_GOONG_MAP_KEY &&
            activeBranch.address?.coordinates?.latitude &&
            activeBranch.address?.coordinates?.longitude ? (
              <GoongMap
                key={`goong-${activeBranch?._id || ""}`}
                center={[
                  activeBranch.address?.coordinates?.longitude,
                  activeBranch.address?.coordinates?.latitude,
                ]}
                zoom={14}
                markers={[
                  {
                    lng: activeBranch.address?.coordinates?.longitude,
                    lat: activeBranch.address?.coordinates?.latitude,
                    title: activeBranch.name,
                  },
                ]}
              />
            ) : (
              <iframe
                title="Branch Map"
                key={`iframe-${activeBranch?._id || ""}`}
                src={mapIframeUrl}
                className="w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          {appliedProvince
            ? "Chọn một chi nhánh để xem bản đồ"
            : "Vui lòng chọn tỉnh/thành và bấm TÌM KIẾM"}
        </div>
      )}
    </div>
  );
};

export default BranchMapPanel;
