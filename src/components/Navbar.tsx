import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingCart,
  User,
  LogIn,
  Menu,
  X,
  Heart,
  Home,
  Store,
  Search,
  ChevronDown,
  MessageCircle,
  LayoutDashboard,
  Settings,
  LogOut
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";

export function Navbar({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const signOut = useAuthStore((state) => state.signOut);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const cartItems = useCartStore((state) => state.items);
  const fetchCart = useCartStore((state) => state.fetchCart);

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(window.scrollY);

  const ADMIN_EMAILS = ["paulelite606@gmail.com", "obajeufedo2@gmail.com"];
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchCart();
    }
  }, [isLoggedIn, fetchCart]);

  useEffect(() => {
    // Close dropdowns when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".profile-menu") && isProfileOpen) {
        setIsProfileOpen(false);
      }
      if (!target.closest(".search-container") && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileOpen, isSearchOpen]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 50) {
        setIsVisible(true);
        lastScrollY.current = window.scrollY;
        return;
      }
      if (window.scrollY > lastScrollY.current) {
        setIsVisible(false); // scrolling down
      } else {
        setIsVisible(true); // scrolling up
      }
      lastScrollY.current = window.scrollY;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
    }
  };

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "";
  };

  const cartItemCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  if (["/login", "/register", "/forgot-password"].includes(location.pathname))
    return null; // Don't show navbar on these pages

  return (
    <header
      className={`bg-[#007BFF] shadow-lg text-white fixed w-full top-0 left-0 transition-transform duration-300 z-50 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {/* Top bar with contact info and social links */}
      <div className="hidden lg:block bg-[#0066CC] py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="text-sm">
            <span className="mr-4">support@ulishastore.com</span>
            <span>Free shipping on orders over ₦50,000</span>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <a href="#" className="hover:text-primary-orange transition-colors">
              Track Order
            </a>
            <a href="#" className="hover:text-primary-orange transition-colors">
              Help
            </a>
            <div className="h-4 w-px bg-blue-300"></div>
            <a href="#" className="hover:text-primary-orange transition-colors">
              English
            </a>
            <a href="#" className="hover:text-primary-orange transition-colors">
              NGN
            </a>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <span className="text-xl lg:text-2xl font-bold">
                <span className="text-primary-orange">Ulisha</span>
                <span className="text-white">Store</span>
              </span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden lg:flex items-center me-auto space-x-5 ml-4">
            {/* <Link
              to="/"
              className={`text-white hover:text-primary-orange transition-colors font-medium ${
                location.pathname === "/" && !location.search
                  ? "text-primary-orange"
                  : ""
              }`}
            >
              Home
            </Link>

            <Link
              to="/wishlist"
              className={`text-white hover:text-primary-orange transition-colors font-medium ${
                location.pathname === "/wishlist" ? "text-primary-orange" : ""
              }`}
            >
              Wishlist
            </Link>

            {isLoggedIn && (
              <Link
                to="/my-store"
                className={`text-white hover:text-primary-orange transition-colors font-medium ${
                  location.pathname === "/my-store" ? "text-primary-orange" : ""
                }`}
              >
                My Store
              </Link>
            )}

            <Link
              to="/chat-support"
              className={`text-white hover:text-primary-orange transition-colors font-medium ${
                location.pathname === "/chat-support"
                  ? "text-primary-orange"
                  : ""
              }`}
            >
              Chat Support
            </Link> */}
          </div>

          {/* Desktop right section */}
          <div className="hidden lg:flex items-center space-x-6">
            {/* Search button */}
            <div className="relative search-container">
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-orange text-gray-700"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-primary-orange text-white px-3 py-2 rounded-r-md hover:bg-primary-orange/90"
                >
                  <Search className="h-4 w-4" />
                </button>
              </form>

              {isSearchOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg p-3 z-50">
                  <form onSubmit={handleSearch} className="flex">
                    <input
                      type="text"
                      placeholder="Search products..."
                      className="w-full px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-orange text-gray-700"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="bg-primary-orange text-white px-3 py-2 rounded-r-md hover:bg-primary-orange/90"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="text-white hover:text-primary-orange transition-colors relative"
            >
              <Heart className="h-5 w-5" />
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              className="text-white hover:text-primary-orange transition-colors relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary-orange text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* User profile */}
            {isLoggedIn ? (
              <div className="relative profile-menu">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="text-white hover:text-primary-orange transition-colors focus:outline-none flex items-center space-x-2"
                >
                  <div
                    className="rounded-full bg-primary-orange flex items-center justify-center"
                    style={{ width: "40px", height: "40px", color: "white" }}
                  >
                    {getInitials(user?.user_metadata?.full_name)}
                  </div>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    )}
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>My Orders</span>
                    </Link>
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="text-white hover:text-primary-orange transition-colors flex items-center space-x-2"
              >
                <LogIn className="h-5 w-5" />
                <span className="hidden xl:inline text-sm font-medium">
                  Sign In
                </span>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center space-x-4 lg:hidden">
            <Link
              to="/cart"
              className="text-white hover:text-primary-orange transition-colors relative"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary-orange text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:text-primary-orange transition-colors focus:outline-none"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`${
          isMenuOpen ? "block" : "hidden"
        } lg:hidden absolute w-full bg-white shadow-lg z-50`}
      >
        <div className="px-4 pt-4 pb-4 space-y-3">
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="flex mb-4">
            <input
              type="text"
              placeholder="Search products..."
              className="w-full px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-orange text-gray-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="bg-primary-orange text-white px-3 py-2 rounded-r-md hover:bg-primary-orange/90"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          <Link
            to="/"
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:text-primary-orange hover:bg-gray-50"
            onClick={() => setIsMenuOpen(false)}
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>

          <Link
            to="/wishlist"
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:text-primary-orange hover:bg-gray-50"
            onClick={() => setIsMenuOpen(false)}
          >
            <Heart className="h-5 w-5" />
            <span>Wishlist</span>
          </Link>

          <Link
            to="/cart"
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:text-primary-orange hover:bg-gray-50"
            onClick={() => setIsMenuOpen(false)}
          >
            <ShoppingCart className="h-5 w-5" />
            <span>Cart ({cartItemCount})</span>
          </Link>

          {isLoggedIn ? (
            <>
              {isAdmin ? (
                <Link
                  to="/admin"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:text-primary-orange hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  <span>Admin Panel</span>
                </Link>
              ) : (
                <>
                  <Link
                    to="/dashboard"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:text-primary-orange hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-5 w-5" />
                    <span>My Orders</span>
                  </Link>
                  <Link
                    to="/my-store"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:text-primary-orange hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Store className="h-5 w-5" />
                    <span>My Store</span>
                  </Link>
                </>
              )}
              <Link
                to="/settings"
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:text-primary-orange hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                <User className="h-5 w-5" />
                <span>Settings</span>
              </Link>
              <button
                onClick={() => {
                  handleSignOut();
                  setIsMenuOpen(false);
                }}
                className="flex w-full items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:text-primary-orange hover:bg-gray-50"
              >
                <LogIn className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:text-primary-orange hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              <LogIn className="h-5 w-5" />
              <span>Login</span>
            </Link>
          )}

          <Link
            to="/chat-support"
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:text-primary-orange hover:bg-gray-50"
            onClick={() => setIsMenuOpen(false)}
          >
            <MessageCircle className="h-5 w-5" />
            <span>Chat Support</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
