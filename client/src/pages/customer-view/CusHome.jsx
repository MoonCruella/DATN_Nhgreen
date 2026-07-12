import MainBanner from "@/components/customer-view/home/MainBanner";
import Categories from "@/components/customer-view/home/Categories";
import React from "react";
import BestSeller from "@/components/customer-view/home/BestSeller";
import NewAdded from "@/components/customer-view/home/NewAdded";
import FlashSale from "@/components/customer-view/home/FlashSale";
import IntroduceBanner from "@/components/customer-view/home/IntroduceBanner";
import FamiliarDishes from "@/components/customer-view/recommendation/FamiliarDishes";

const CustomerHome = () => {
  return (
    <div className="bg-[#fbfbf7] pb-10">
      <MainBanner />
      <Categories />
      <FlashSale />
      <IntroduceBanner />
      <FamiliarDishes limit={4} />
      <BestSeller />
      <NewAdded />
    </div>
  );
};

export default CustomerHome;
