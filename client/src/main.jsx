import { createRoot } from "react-dom/client";
import "./index.css";
// react-slick styles (slick-carousel)
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "./components/ui/sonner";
import store from "./store/store.js";
import { CartProvider } from "./context/CartContext.jsx";
import { AddressProvider } from "./context/AddressContext";
import { SupportChatProvider } from "./context/SupportChatContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Provider store={store}>
      <CartProvider>
        <AddressProvider>
          <SocketProvider>
            <SupportChatProvider>
              <App />
            </SupportChatProvider>
          </SocketProvider>
        </AddressProvider>
        <Toaster position="bottom-right" richColors />
      </CartProvider>
    </Provider>
  </BrowserRouter>
);
