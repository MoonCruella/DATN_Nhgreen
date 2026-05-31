import React, { useEffect, useState, useMemo } from "react";
import branchApi from "@/api/branchApi";
import { getAllProvinces } from "@/api/locationApi";
import { assets } from "@/assets/assets";
import BranchListPanel from "@/components/customer-view/branch/BranchListPanel";
import BranchMapPanel from "@/components/customer-view/branch/BranchMapPanel";

const CustomerBranches = () => {
  // Scroll to top when opening this page
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      // Fallback for older browsers
      window.scrollTo(0, 0);
    }
  }, []);

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Pending selections (controlled by dropdowns)
  const [pendingProvince, setPendingProvince] = useState(null);
  const [pendingDistrict, setPendingDistrict] = useState(null);
  // Applied filters (only update when clicking "TÌM KIẾM")
  const [appliedProvince, setAppliedProvince] = useState(null);
  const [appliedDistrict, setAppliedDistrict] = useState(null);
  const [activeBranch, setActiveBranch] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);

  // Fetch branches once
  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true);
      try {
        const res = await branchApi.getAll({ active: true, limit: 500 });
        const data = res?.data?.branches || res?.data || [];
        setBranches(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err?.response?.data?.message || "Không thể tải danh sách chi nhánh"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, []);

  // Fetch provinces/districts
  useEffect(() => {
    (async () => {
      try {
        const all = await getAllProvinces();
        const provs = (all || []).map((p) => ({
          code: p.code,
          name: p.name,
          districts: p.districts || [],
        }));
        setProvinces(provs);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Keep initial province empty so the placeholder is shown until user selects

  // When pending province changes, rebuild district options
  useEffect(() => {
    if (!pendingProvince) {
      setDistricts([]);
      setPendingDistrict(null);
      return;
    }
    const p = provinces.find(
      (x) => String(x.code) === String(pendingProvince.code)
    );
    const ds = (p?.districts || []).map((d) => ({
      code: d.code,
      name: d.name,
    }));
    setDistricts(ds);
    setPendingDistrict(null);
  }, [pendingProvince, provinces]);

  // Filter branches by applied province/district (only changes after clicking search)
  const filteredBranches = useMemo(() => {
    if (!appliedProvince) return [];
    let list = branches.filter(
      (b) => String(b.address?.province?.code) === String(appliedProvince.code)
    );
    if (appliedDistrict && appliedDistrict.code) {
      list = list.filter(
        (b) =>
          String(b.address?.district?.code) === String(appliedDistrict.code)
      );
    }
    return list;
  }, [branches, appliedProvince, appliedDistrict]);

  // Default active branch when province changes
  useEffect(() => {
    if (filteredBranches.length > 0) {
      setActiveBranch(filteredBranches[0]);
    } else {
      setActiveBranch(null);
    }
  }, [filteredBranches]);

  // Build a universal Google Maps iframe URL: prefer lat/lng, otherwise use address query string
  const mapIframeUrl = useMemo(() => {
    if (!activeBranch) return null;
    const lat = activeBranch.address?.coordinates?.latitude;
    const lng = activeBranch.address?.coordinates?.longitude;
    if (lat && lng) {
      return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    }
    const query =
      activeBranch.address?.full_address ||
      [
        activeBranch.address?.street,
        activeBranch.address?.ward?.name,
        activeBranch.address?.district?.name,
        activeBranch.address?.province?.name,
      ]
        .filter(Boolean)
        .join(", ") ||
      activeBranch.name;
    if (!query) return null;
    return `https://maps.google.com/maps?q=${encodeURIComponent(
      query
    )}&z=15&output=embed`;
  }, [activeBranch]);

  return (
    <main className="min-h-screen bg-[#fbfbf7]">
      {/* Hero / Header */}

      {/* Content */}
      <div className="relative max-w-screen-2xl mx-auto px-4 md:px-24 py-16 md:py-10 flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl md:text-2xl lg:text-3xl font-bold text-black mb-3 drop-shadow-md">
          Hệ thống chi nhánh
        </h1>
        <p className="text-base md:text-lg text-black/95 max-w-2xl leading-relaxed drop-shadow">
          Chọn tỉnh/thành để xem các chi nhánh gần bạn. Nhấp vào một chi nhánh
          để xem vị trí trên bản đồ.
        </p>
      </div>

      {/* Province Selector */}
      <div className=" border-y">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-24 py-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <select
            className="w-full bg-white border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            value={pendingProvince?.code || ""}
            onChange={(e) => {
              const code = e.target.value;
              const p = provinces.find((x) => String(x.code) === String(code));

              setPendingProvince(p ? { code: p.code, name: p.name } : null);
            }}
          >
            <option value="">Chọn tỉnh thành</option>
            {(provinces || []).map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            className="w-full bg-white border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            value={pendingDistrict?.code || ""}
            onChange={(e) => {
              const code = e.target.value;
              const d = districts.find((x) => String(x.code) === String(code));
              setPendingDistrict(d || null);
            }}
            disabled={!pendingProvince}
          >
            <option value="">Chọn quận huyện</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              // Apply filters only when clicking search
              setAppliedProvince(pendingProvince);
              setAppliedDistrict(pendingDistrict);
              // activeBranch will be set by effect on filteredBranches, but we can optimistically choose first after next render
            }}
            className="w-full md:w-auto justify-center bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg px-6 py-3 cursor-pointer flex items-center"
          >
            TÌM KIẾM
          </button>
        </div>
      </div>

      {/* Content Split */}
      <div className="max-w-screen-2xl mx-auto px-4 md:px-24 py-8 grid md:grid-cols-2 gap-8">
        <BranchListPanel
          appliedProvince={appliedProvince}
          loading={loading}
          error={error}
          filteredBranches={filteredBranches}
          activeBranch={activeBranch}
          onSelectBranch={(b) => setActiveBranch(b)}
        />
        <BranchMapPanel
          activeBranch={activeBranch}
          mapIframeUrl={mapIframeUrl}
          appliedProvince={appliedProvince}
        />
      </div>
    </main>
  );
};

export default CustomerBranches;
