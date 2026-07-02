import MainBanner from "@/components/customer-view/home/MainBanner";
import Categories from "@/components/customer-view/home/Categories";
import React from "react";
import BestSeller from "@/components/customer-view/home/BestSeller";
import NewAdded from "@/components/customer-view/home/NewAdded";
import FlashSale from "@/components/customer-view/home/FlashSale";
import IntroduceBanner from "@/components/customer-view/home/IntroduceBanner";
import DishForGym from "@/components/customer-view/home/DishForGym";
import RecommendedDishes from "@/components/customer-view/recommendation/RecommendedDishes";
import FamiliarDishes from "@/components/customer-view/recommendation/FamiliarDishes";

const CustomerHome = () => {
  return (
    <div className="bg-[#fbfbf7] pb-10">
      <MainBanner />
      <Categories />
      <FlashSale />
      <IntroduceBanner />
      <FamiliarDishes limit={4} />
      <RecommendedDishes limit={8} />
      <BestSeller />
      <DishForGym />
      <NewAdded />
    </div>
  );
};

export default CustomerHome;
