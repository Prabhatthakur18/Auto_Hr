import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, X, Search, Bell } from 'lucide-react';
import { companies as initialCompanies, employees as initialEmployees } from '../data/mockData';
import { Company, Employee } from '../types';
import Header from '../components/Header';
import CompanyForm from '../components/admin/CompanyForm';
import EmployeeForm from '../components/admin/EmployeeForm';
import ToastContainer from '../components/ToastContainer';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showSuccess, showError, removeToast } = useToast();
  const { user, isLoggedIn } = useAuth();
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [activeTab, setActiveTab] = useState<'companies' | 'employees'>('companies');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState<string>('Are you sure?');
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  const [confirmAction, setConfirmAction] = useState<() => void>(() => () => {});

  // Redirect if not logged in
  if (!isLoggedIn || !user) {
    navigate('/');
    return null;
  }

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => onConfirm);
    setConfirmOpen(true);
  };

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    if (searchQuery.length < 3) {
      return employees;
    }
    return employees.filter(employee =>
      employee.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  const handleSaveCompany = (company: Company) => {
    try {
      if (editingCompany) {
        setCompanies(companies.map(c => c.id === company.id ? company : c));
        showSuccess('Company updated successfully!');
      } else {
        setCompanies([...companies, { ...company, id: Date.now().toString() }]);
        showSuccess('Company added successfully!');
      }
      setEditingCompany(null);
      setShowCompanyForm(false);
    } catch (error) {
      showError('Failed to save company. Please try again.');
    }
  };

  const handleSaveEmployee = (employee: Employee) => {
    try {
      if (editingEmployee) {
        setEmployees(employees.map(e => e.id === employee.id ? employee : e));
        showSuccess('Employee saved successfully!');
      } else {
        setEmployees([...employees, { ...employee, id: Date.now().toString() }]);
        showSuccess('Employee added successfully!');
      }
      setEditingEmployee(null);
      setShowEmployeeForm(false);
    } catch (error) {
      showError('Failed to save employee. Please try again.');
    }
  };

  const handleDeleteCompany = (id: string) => {
    if (!user.permissions.canDeleteCompany) {
      showError('You do not have permission to delete companies.');
      return;
    }

    openConfirm(
      'Delete Company?',
      'This will permanently delete the company and all associated employees. This action cannot be undone.',
      () => {
        try {
          setCompanies(prev => prev.filter(c => c.id !== id));
          setEmployees(prev => prev.filter(e => e.companyId !== id));
          showSuccess('Company deleted successfully!');
        } catch (error) {
          showError('Failed to delete company. Please try again.');
        } finally {
          setConfirmOpen(false);
        }
      }
    );
  };

  const handleDeleteEmployee = (id: string) => {
    if (!user.permissions.canDeleteEmployee) {
      showError('You do not have permission to delete employees.');
      return;
    }

    openConfirm(
      'Delete Employee?',
      'This will permanently delete the selected employee. This action cannot be undone.',
      () => {
        try {
          setEmployees(prev => prev.filter(e => e.id !== id));
          showSuccess('Employee deleted successfully!');
        } catch (error) {
          showError('Failed to delete employee. Please try again.');
        } finally {
          setConfirmOpen(false);
        }
      }
    );
  };

  const handleEditCompany = (company: Company) => {
    if (!user.permissions.canEditCompany) {
      showError('You do not have permission to edit companies.');
      return;
    }
    setEditingCompany(company);
    setShowCompanyForm(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    if (!user.permissions.canEditEmployee) {
      showError('You do not have permission to edit employees.');
      return;
    }
    setEditingEmployee(employee);
    setShowEmployeeForm(true);
  };

  const handleAddCompany = () => {
    if (!user.permissions.canAddCompany) {
      showError('You do not have permission to add companies.');
      return;
    }
    setEditingCompany(null);
    setShowCompanyForm(true);
  };

  const handleAddEmployee = () => {
    if (!user.permissions.canAddEmployee) {
      showError('You do not have permission to add employees.');
      return;
    }
    setEditingEmployee(null);
    setShowEmployeeForm(true);
  };

  const handleCloseForm = () => {
    setEditingCompany(null);
    setEditingEmployee(null);
    setShowCompanyForm(false);
    setShowEmployeeForm(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmAction}
        onCancel={() => setConfirmOpen(false)}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600 mt-1">Manage companies and employees</p>
              {user && (
                <p className="text-sm text-gray-500 mt-1">
                  Logged in as <strong>{user.username}</strong> ({user.role})
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/toast-demo')}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Bell className="w-4 h-4 mr-2" />
              Test Toasts
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex justify-between items-center px-6">
              <nav className="flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('companies')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'companies'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Companies ({companies.length})
                </button>
                <button
                  onClick={() => setActiveTab('employees')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'employees'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Employees ({employees.length})
                </button>
              </nav>
              
              {/* Search Bar - Only show for employees tab */}
              {activeTab === 'employees' && (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 w-64 text-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {searchQuery.length > 0 && searchQuery.length < 3 && (
                    <div className="absolute top-full left-0 right-0 mt-1 text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                      Type at least 3 characters to search
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'companies' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Company Management</h2>
                  {user.permissions.canAddCompany && (
                    <button
                      onClick={handleAddCompany}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Company
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Industry
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employees
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {companies.map((company) => (
                        <tr key={company.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{company.name}</div>
                              <div className="text-sm text-gray-500">Est. {company.established}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {company.industry}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {company.location}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {company.employees}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {user.permissions.canEditCompany && (
                              <button
                                onClick={() => handleEditCompany(company)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                                title="Edit Company"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {user.permissions.canDeleteCompany && (
                              <button
                                onClick={() => handleDeleteCompany(company.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete Company"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'employees' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Employee Management</h2>
                    {searchQuery.length >= 3 && (
                      <p className="text-sm text-gray-600 mt-1">
                        Showing {filteredEmployees.length} of {employees.length} employees
                      </p>
                    )}
                  </div>
                  {user.permissions.canAddEmployee && (
                    <button
                      onClick={handleAddEmployee}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Employee
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredEmployees.map((employee) => {
                        const company = companies.find(c => c.id === employee.companyId);
                        return (
                          <tr key={employee.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <img
                                  className="h-10 w-10 rounded-full"
                                  src={employee.avatar}
                                  alt={employee.name}
                                />
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                                  <div className="text-sm text-gray-500">{employee.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {employee.position}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {employee.department}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {company?.name || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {user.permissions.canEditEmployee && (
                                <button
                                  onClick={() => handleEditEmployee(employee)}
                                  className="text-blue-600 hover:text-blue-900 mr-4"
                                  title="Edit Employee"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {user.permissions.canDeleteEmployee && (
                                <button
                                  onClick={() => handleDeleteEmployee(employee.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete Employee"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {/* No results message */}
                  {searchQuery.length >= 3 && filteredEmployees.length === 0 && (
                    <div className="text-center py-8">
                      <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No employees found</p>
                      <p className="text-gray-400 text-sm">Try adjusting your search query</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Company Form Modal */}
      {showCompanyForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCompany ? 'Edit Company' : 'Add New Company'}
              </h3>
              <button
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <CompanyForm
              company={editingCompany}
              onSave={handleSaveCompany}
              onCancel={handleCloseForm}
            />
          </div>
        </div>
      )}

      {/* Employee Form Modal */}
      {showEmployeeForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              <button
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <EmployeeForm
              employee={editingEmployee}
              companies={companies}
              onSave={handleSaveEmployee}
              onCancel={handleCloseForm}
              userPermissions={user.permissions}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;