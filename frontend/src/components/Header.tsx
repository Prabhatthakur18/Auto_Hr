import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UserCog, LogOut, Shield, Building, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logo from "../images/autologo-removebg-preview.png";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, logout } = useAuth();

  const handleAdminClick = () => {
    navigate(location.pathname === "/admin" ? "/" : "/admin");
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRoleIcon = () => {
    if (!user) return null;
    
    switch (user.role) {
      case 'HR':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'MANAGEMENT':
        return <Building className="w-4 h-4 text-green-600" />;
      case 'EMPLOYEE':
        return <User className="w-4 h-4 text-purple-600" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img
              src={logo}
              alt="company-logo"
              className="w-16 h-16 object-contain"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center space-x-3">
            {isLoggedIn && user && (
              <>
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
                  {getRoleIcon()}
                  <span className="text-sm font-medium text-gray-700">
                    {user.username} ({user.role})
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            )}
            {isLoggedIn && (
              <button
                onClick={handleAdminClick}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserCog className="w-4 h-4" />
                <span>{location.pathname === "/admin" ? "Dashboard" : "Admin Panel"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
