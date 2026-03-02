import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Employee } from '../types';
import { Users, ChevronDown, Eye } from 'lucide-react';

interface EmployeeSelectorProps {
  employees: Employee[];
  selectedCompanyId: string | null;
}

const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({ 
  employees, 
  selectedCompanyId 
}) => {
  const navigate = useNavigate();
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>('');

  const companyEmployees = employees.filter(emp => emp.companyId === selectedCompanyId);
  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
  };

  const handleViewProfile = () => {
    if (selectedEmployeeId) {
      navigate(`/profile/${selectedEmployeeId}`);
    }
  };

  // Reset selected employee when company changes
  React.useEffect(() => {
    setSelectedEmployeeId('');
  }, [selectedCompanyId]);

  if (!selectedCompanyId) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Select a company first to view employees</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <Users className="w-5 h-5 mr-2 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Select Employee</h2>
        <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
          {companyEmployees.length} employees
        </span>
      </div>
      
      <div className="relative mb-4">
        <select
          value={selectedEmployeeId}
          onChange={(e) => handleEmployeeChange(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer text-gray-900"
        >
          <option value="">Choose an employee...</option>
          {companyEmployees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name} - {employee.position}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
      
      {selectedEmployee && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-4">
              <img
                src={selectedEmployee.avatar}
                alt={selectedEmployee.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{selectedEmployee.name}</h3>
                <p className="text-sm text-gray-600">{selectedEmployee.position}</p>
                <p className="text-sm text-gray-500">{selectedEmployee.department}</p>
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  <p>📧 {selectedEmployee.email}</p>
                  <p>📞 {selectedEmployee.phone}</p>
                  <p>📅 Joined {new Date(selectedEmployee.joinDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleViewProfile}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Full Profile
          </button>
        </div>
      )}
      
      {companyEmployees.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No employees found for this company</p>
        </div>
      )}
    </div>
  );
};

export default EmployeeSelector;