import React from "react";
import { NavLink, Link } from "react-router-dom";
import logo from "../../assets/logo.png";

const IconButton = ({ children, title = "", className = "", ...props }) => (
  <button
    type="button"
    aria-label={title}
    title={title}
    className={
      "flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-50 focus:outline-none " +
      className
    }
    {...props}
  >
    {children}
  </button>
);

const Header = () => {
  const cartCount = 4; // replace with selector or prop when integrating with cart state.

  const linkClass = ({ isActive }) =>
    (isActive ? "text-green-500 font-semibold" : "text-gray-700") +
    " hover:text-green-500";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Left: logo */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/">
              <img src={logo} alt="Cabbage" className="h-16 w-auto" />
            </Link>
          </div>
          <h1 className="text-lg font-bold">Đăng nhập</h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
