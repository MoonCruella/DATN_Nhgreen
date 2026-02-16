import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import cartService from "@/api/cartApi.js";
import { useSelector } from "react-redux";
import { toast } from "sonner";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated, accessToken } = useSelector(
    (state) => state.auth
  );
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState([]); //  Main state
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  //  UNIFIED loadCart function - Update items state
  const loadCart = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setItems([]);

      setSelectedItems([]);
      setIsLoading(false);
      return null;
    }

    try {
      setLoading(true);
      setIsLoading(true);

      const res = await cartService.getCart(accessToken);

      if (res.success) {
        const cartData = res.data || [];
        setItems(cartData);

        // Tự động deselect món inactive khi load cart
        setSelectedItems((prevSelected) => {
          const validSelections = prevSelected.filter((itemId) => {
            const item = cartData.find((cartItem) => cartItem._id === itemId);
            // Giữ lại nếu món còn active
            return item && item.dish_id?.status === "active";
          });
          return validSelections;
        });

        return cartData;
      } else {
        console.warn("⚠️ Cart load failed");
        setItems([]);
        return [];
      }
    } catch (err) {
      console.error("❌ Error loading cart:", err);
      setItems([]);
      return [];
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  }, [isAuthenticated, user, accessToken]);

  //  fetchCart is now just an alias for loadCart
  const fetchCart = loadCart;

  //  Initial load
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Thêm sản phẩm
  const addToCart = async (dish_id, quantity = 1, flashSaleId = null) => {
    if (!isAuthenticated || !user) return;

    try {
      const res = await cartService.addToCart(
        accessToken,
        dish_id,
        quantity,
        flashSaleId
      );
      if (res.success) {
        // Reload cart để lấy đầy đủ thông tin Flash Sale từ backend
        await loadCart();

        // Auto select new item sau khi reload
        const newItemId = res.data._id;
        if (newItemId && !selectedItems.includes(newItemId)) {
          setSelectedItems((prev) => [...prev, newItemId]);
        }
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
      throw err; // Re-throw để component có thể handle
    }
  };

  // Cập nhật số lượng
  const updateQuantity = async (cartItem_id, quantity) => {
    if (!isAuthenticated || !user) return;

    try {
      const res = await cartService.updateCartItem(
        accessToken,
        cartItem_id,
        quantity
      );
      if (res.success) {
        setItems((prev) =>
          prev.map((item) =>
            item._id === cartItem_id
              ? { ...item, quantity: res.data.quantity }
              : item
          )
        );
      }
    } catch (err) {
      console.error("Error updating cart:", err);
      const errorMessage = err.response?.data?.message || "Không thể cập nhật số lượng";
      toast.error(errorMessage);
    }
  };

  // Xóa sản phẩm
  const removeFromCart = async (itemId) => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(true);

      const response = await cartService.removeFromCart(accessToken, itemId);

      if (response.success) {
        //  Update local state immediately
        setItems((prev) => prev.filter((item) => item._id !== itemId));
        setSelectedItems((prev) => prev.filter((id) => id !== itemId));

        toast.success("Đã xóa khỏi giỏ hàng");

        //  Reload to ensure sync
        await loadCart();
      } else {
        toast.error(response.message || "Không thể xóa sản phẩm");
        await loadCart();
      }
    } catch (error) {
      console.error("❌ Remove from cart error:", error);

      // Only show error if not success
      if (error.response?.status !== 200) {
        toast.error("Có lỗi xảy ra");
      }

      await loadCart();
    } finally {
      setLoading(false);
    }
  };

  // Xóa nhiều items
  const removeMultipleItems = async (itemIds) => {
    if (!isAuthenticated || !user) return;
    if (!Array.isArray(itemIds) || itemIds.length === 0) return;

    try {
      setLoading(true);

      const response = await cartService.removeMultipleItems(
        accessToken,
        itemIds
      );

      if (response.success) {
        // Update local state
        setItems((prev) => prev.filter((item) => !itemIds.includes(item._id)));
        setSelectedItems((prev) => prev.filter((id) => !itemIds.includes(id)));

        //toast.success(`Đã xóa ${itemIds.length} sản phẩm khỏi giỏ hàng`);

        // Reload to sync
        await loadCart();
      } else {
        console.error("❌ Remove multiple items failed");
        toast.error("Không thể cập nhật giỏ hàng");
        await loadCart();
      }
    } catch (error) {
      console.error("❌ Remove multiple items error:", error);
      toast.error("Có lỗi xảy ra");
      await loadCart();
    } finally {
      setLoading(false);
    }
  };

  // Xóa toàn bộ giỏ
  const clearCart = async () => {
    if (!isAuthenticated || !user) return;

    try {
      console.warn("⚠️ clearCart() called");
      const res = await cartService.clearCart(accessToken);
      if (res.success) {
        setItems([]);
        setSelectedItems([]);
        toast.success("Đã xóa toàn bộ giỏ hàng");
      }
    } catch (err) {
      console.error("Error clearing cart:", err);
      toast.error("Không thể xóa giỏ hàng");
    }
  };

  // Toggle single item selection
  const toggleSelectItem = (itemId) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  // Select all items
  const selectAllItems = () => {
    setSelectedItems(items.map((item) => item._id));
  };

  // Deselect all items
  const deselectAllItems = () => {
    setSelectedItems([]);
  };

  // Check if all items are selected
  const isAllSelected =
    items.length > 0 && selectedItems.length === items.length;

  // Get selected items details
  const getSelectedItems = () => {
    return items.filter((item) => selectedItems.includes(item._id));
  };

  // Calculate selected items total
  const getSelectedTotal = () => {
    return getSelectedItems().reduce((total, item) => {
      // Priority: Flash Sale price > Sale price > Regular price
      const flashSalePrice = item.flashSale?.salePrice;
      const regularSalePrice = item.dish_id?.sale_price;
      const regularPrice = item.dish_id?.price;

      const price = flashSalePrice || regularSalePrice || regularPrice || 0;
      const quantity = Number(item.quantity) || 0;
      return total + price * quantity;
    }, 0);
  };

  const refreshCart = loadCart;

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        isLoading,
        addToCart,
        updateQuantity,
        removeFromCart,
        removeMultipleItems,
        fetchCart,
        clearCart,
        loadCart,
        refreshCart,
        isAuthenticated,
        hasUser: !!user,
        selectedItems,
        toggleSelectItem,
        selectAllItems,
        deselectAllItems,
        isAllSelected,
        getSelectedItems,
        getSelectedTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => useContext(CartContext);
