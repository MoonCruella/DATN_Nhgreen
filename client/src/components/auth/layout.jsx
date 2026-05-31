import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

const Layout = () => {
  return (
    <div className="flex flex-col bg-white overflow-hidden">
      <Header />
      <main className="flex flex-col min-h-screen bg-[#fbfbf7] p-24 w-full items-center justify-center py-12 pt-5">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
