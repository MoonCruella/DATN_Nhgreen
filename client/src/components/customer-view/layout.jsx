import React from "react";
import { Outlet } from "react-router-dom";
import CustomerHeader from "./Header";
import CustomerFooter from "./Footer";
import ChatWidget from "./chat/SupportChat";

const CustomerLayout = () => {
  return (
    <div className="flex flex-col bg-white">
      <CustomerHeader />
      <main className="flex flex-col w-full ">
        <Outlet />
      </main>
      <CustomerFooter />
      <ChatWidget />
    </div>
  );
};

export default CustomerLayout;
