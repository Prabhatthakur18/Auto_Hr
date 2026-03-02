import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Company } from '../types';
import { companies, employees } from '../data/mockData';
import Header from '../components/Header';
import CompanySelector from '../components/CompanySelector';
import EmployeeSelector from '../components/EmployeeSelector';
import LoginForm from '../components/LoginForm';
import ToastContainer from '../components/ToastContainer';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import { LogIn, X, Bell, Shield, Building, User } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const { toasts, showSuccess, showError, removeToast } = useToast();
  const { user, isLoggedIn, logout } = useAuth();

  const handleLoginSuccess = () => {
    showSuccess(`Welcome ${user?.username}! You are logged in as ${user?.role}`);
    setShowLoginForm(false);
  };

  const handleLogout = () => {
    logout();
    showSuccess('Logged out successfully');
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

  // If not logged in, show login form
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  if (showLoginForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="relative">
          <button
            onClick={() => setShowLoginForm(false)}
            className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Company Management</h1>
              <p className="text-gray-600 mt-2">Select a company and employee to manage profiles and view details</p>
              {user && (
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  {getRoleIcon()}
                  <span className="ml-2">
                    Logged in as <strong>{user.username}</strong> ({user.role})
                  </span>
                </div>
              )}
            </div>
    
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CompanySelector
            companies={companies}
            selectedCompany={selectedCompany}
            onSelectCompany={setSelectedCompany}
          />
          
          <EmployeeSelector
            employees={employees}
            selectedCompanyId={selectedCompany?.id || null}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;