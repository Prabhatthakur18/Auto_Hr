import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import Header from '../components/Header';
import ToastContainer from '../components/ToastContainer';
import { useToast } from '../hooks/useToast';

const ToastDemo: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showSuccess, showError, removeToast } = useToast();

  const handleLoginSuccess = () => {
    showSuccess('Login successful!');
  };

  const handleAddCompany = () => {
    showSuccess('Company added successfully!');
  };

  const handleUpdateCompany = () => {
    showSuccess('Company updated successfully!');
  };

  const handleDeleteCompany = () => {
    showSuccess('Company deleted successfully!');
  };

  const handleAddEmployee = () => {
    showSuccess('Employee added successfully!');
  };

  const handleEditEmployee = () => {
    showSuccess('Employee edited successfully!');
  };

  const handleSaveEmployee = () => {
    showSuccess('Employee saved successfully!');
  };

  const handleDeleteEmployee = () => {
    showSuccess('Employee deleted successfully!');
  };

  const handleError = () => {
    showError('An error occurred. Please try again.');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Toast Notification Demo</h1>
            <p className="text-gray-600 mt-1">Test all the different toast notifications</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Success Toasts */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                Success Notifications
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleLoginSuccess}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Login Successful
                </button>
                <button
                  onClick={handleAddCompany}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Company
                </button>
                <button
                  onClick={handleUpdateCompany}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Update Company
                </button>
                <button
                  onClick={handleDeleteCompany}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Delete Company
                </button>
                <button
                  onClick={handleAddEmployee}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Employee
                </button>
                <button
                  onClick={handleEditEmployee}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Edit Employee
                </button>
                <button
                  onClick={handleSaveEmployee}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save Employee
                </button>
                <button
                  onClick={handleDeleteEmployee}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Delete Employee
                </button>
              </div>
            </div>

            {/* Error Toasts */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <XCircle className="w-5 h-5 text-red-500 mr-2" />
                Error Notifications
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleError}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Show Error
                </button>
                <button
                  onClick={() => showError('Failed to save company. Please try again.')}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Company Save Error
                </button>
                <button
                  onClick={() => showError('Failed to delete employee. Please try again.')}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Employee Delete Error
                </button>
                <button
                  onClick={() => showError('Login failed. Please check your credentials.')}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Login Error
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Success toasts appear with green color and checkmark icon</li>
              <li>• Error toasts appear with red color and X icon</li>
              <li>• Toasts automatically disappear after 5 seconds</li>
              <li>• Click the X button to manually close a toast</li>
              <li>• Multiple toasts stack vertically in the top-right corner</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToastDemo;
