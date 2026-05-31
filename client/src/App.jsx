import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Layout from "./components/auth/Layout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AdminLayout from "./components/admin-view/AdminLayout";
import AdminDashboard from "./pages/admin-view/AdDashboard";
import AdminProducts from "./pages/admin-view/dish/AdDishes";
import AdminOrders from "./pages/admin-view/AdOrders";
import CustomerLayout from "./components/customer-view/Layout";
import NotFound from "./pages/not-found/Index";
import CustomerHome from "./pages/customer-view/CusHome";
import ManagerLayout from "./components/manager-view/ManagerLayout";
import ManagerDashboard from "./pages/manager-view/MaDashboard";
import CheckAuth from "./components/common/CheckAuth";
import UnauthPage from "./pages/unauth-page/Index";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { refreshAccessToken } from "./store/auth-slice";
import useAxiosPrivate from "./api/useAxiosPrivate";
import { Skeleton } from "@/components/ui/skeleton";
import AdminIngredients from "./pages/admin-view/AdIngredients";
import AdminMyAccount from "./pages/admin-view/AdMyAccount";
import AdminSettings from "./pages/admin-view/AdSettings";
import AdminUserAccount from "./pages/admin-view/AdMangeUser";
import AdminVouchers from "./pages/admin-view/AdVouchers";
import AdminBranches from "./pages/admin-view/branch/AdBranches";
import AdminBranchCreate from "./pages/admin-view/branch/AdBranchCreate";
import AdminBranchDetail from "./pages/admin-view/branch/AdBranchDetail";
import AdminRating from "./pages/admin-view/AdRatings";
import AdChatPage from "./pages/admin-view/AdChatPage";
import AdminCategories from "./pages/admin-view/AdCategories";
import CustomerProducts from "./pages/customer-view/CusProducts";
import ProductDetails from "./pages/customer-view/CusProductDetails";
import CustomerCart from "./pages/customer-view/CusCart";
import CustomerBranches from "./pages/customer-view/CusBranchs";
import CusFlashsaleProducts from "./pages/customer-view/CusFlashsaleProducts";
import CusProductsByTag from "./pages/customer-view/CusProductsByTag";
import AdminFlashSale from "./pages/admin-view/flash-sale/AdFlashSale";
import AdminFlashSaleDetail from "./pages/admin-view/flash-sale/AdFlashSaleDetail";
import AdminFlashSaleCreate from "./pages/admin-view/flash-sale/AdFlashSaleCreate";
import AdminDishCreate from "./pages/admin-view/dish/AdDishCreate";
import AdminDishDetail from "./pages/admin-view/dish/AdDishDetail";
import CustomerCheckout from "./pages/customer-view/CusCheckout";
import CusProfile from "./pages/customer-view/CusProfile";
import ProfileInfo from "./components/customer-view/profile/ProfileInfo";
import ProfileOrders from "./components/customer-view/profile/ProfileOrders";
import ProfileAddress from "./components/customer-view/profile/ProfileAddress";
import ProfilePassword from "./components/customer-view/profile/ProfilePassword";
import ScrollToTop from "./components/common/ScrollToTop";
import SupportChat from "./components/customer-view/chat/SupportChat";
import MaManageDishes from "./pages/manager-view/MaManageDishes";
import MaManageOrder from "./pages/manager-view/MaManageOrder";
import MaDineInOrders from "./pages/manager-view/MaDineInOrders";
import MaOrderDetail from "./pages/manager-view/MaOrderDetail";

import MaNotifications from "./pages/manager-view/MaNotifications";
import ManagerRating from "./pages/manager-view/MaRatings";
import MaManageTables from "./pages/manager-view/MaManageTables";

function App() {
  const { user, isAuthenticated, isLoading } = useSelector(
    (state) => state.auth
  );
  const dispatch = useDispatch();
  // Mount interceptor once for the whole app so axiosPrivate handles auth/refresh
  useAxiosPrivate();

  useEffect(() => {
    dispatch(refreshAccessToken());
  }, [dispatch]);

  //if (isLoading) return <Skeleton className="h-[800px] bg-black w-[600px] " />;
  console.log(isLoading, user);
  return (
    <div className="  bg-white">
      <ScrollToTop />
      <SupportChat />
      <Routes>
        <Route
          path="/"
          element={
            <CheckAuth isAuthenticated={isAuthenticated} user={user}>
              <CustomerLayout />
            </CheckAuth>
          }
        >
          <Route path="/" element={<CustomerHome />} />
          <Route path="/home" element={<CustomerHome />} />
          <Route path="/menu" element={<CustomerProducts />} />
          <Route path="/products" element={<CustomerProducts />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/products/tags" element={<CusProductsByTag />} />
          <Route
            path="/flashsale-products"
            element={<CusFlashsaleProducts />}
          />
          <Route path="/my-cart" element={<CustomerCart />} />
          <Route path="/checkout" element={<CustomerCheckout />} />
          <Route path="/branches" element={<CustomerBranches />} />
          <Route path="/my-account" element={<CusProfile />}>
            <Route index element={<Navigate to="info" replace />} />
            <Route path="info" element={<ProfileInfo />} />
            <Route path="orders" element={<ProfileOrders />} />
            <Route path="password" element={<ProfilePassword />} />
            <Route path="orders/:orderId" element={<ProfileOrders />} />{" "}
            <Route path="address" element={<ProfileAddress />} />
          </Route>
        </Route>

        <Route
          path="/auth"
          element={
            <CheckAuth isAuthenticated={isAuthenticated} user={user}>
              <Layout />
            </CheckAuth>
          }
        >
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <CheckAuth isAuthenticated={isAuthenticated} user={user}>
              <AdminLayout />
            </CheckAuth>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="dishes" element={<AdminProducts />} />
          <Route path="dishes/create" element={<AdminDishCreate />} />
          <Route path="dishes/:id" element={<AdminDishDetail />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="ingredients" element={<AdminIngredients />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="my-account" element={<AdminMyAccount />} />
          <Route path="system-settings" element={<AdminSettings />} />
          <Route path="ratings" element={<AdminRating />} />
          <Route path="manage-user" element={<AdminUserAccount />} />
          <Route path="vouchers" element={<AdminVouchers />} />
          <Route path="branches" element={<AdminBranches />} />
          <Route path="branches/create" element={<AdminBranchCreate />} />
          <Route path="branches/:id" element={<AdminBranchDetail />} />
          <Route path="flash-sale" element={<AdminFlashSale />} />
          <Route path="flash-sale/create" element={<AdminFlashSaleCreate />} />
          <Route path="flash-sale/:id" element={<AdminFlashSaleDetail />} />
          <Route path="chat" element={<AdChatPage />} />
        </Route>
        {/* Manager routes */}
        <Route
          path="/manager"
          element={
            <CheckAuth isAuthenticated={isAuthenticated} user={user}>
              <ManagerLayout />
            </CheckAuth>
          }
        >
          <Route path="dashboard" element={<ManagerDashboard />} />
          <Route path="dishes" element={<MaManageDishes />} />
          <Route
            path="orders"
            element={<Navigate to="/manager/orders/online" replace />}
          />
          <Route path="orders/online" element={<MaManageOrder />} />
          <Route path="orders/dine-in" element={<MaDineInOrders />} />
          <Route path="tables" element={<MaManageTables />} />
          <Route path="notifications" element={<MaNotifications />} />
          <Route path="orders/:orderId" element={<MaOrderDetail />} />
          <Route path="ratings" element={<ManagerRating />} />
        </Route>
        <Route path="*" element={<NotFound />} />
        <Route path="/unauth-page" element={<UnauthPage />} />
      </Routes>
    </div>
  );
}

export default App;
