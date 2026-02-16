import React, { useEffect } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import ProfileSidebar from "@/components/customer-view/profile/ProfileSidebar";

const CusProfile = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="bg-[#fbfbf7] min-h-screen pb-10">
      {/* Main Content */}
      <div className="mx-28 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - 1 column */}
          <div className="lg:col-span-1">
            <ProfileSidebar />
          </div>

          {/* Content Area - 3 columns */}
          <div className="lg:col-span-3">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CusProfile;