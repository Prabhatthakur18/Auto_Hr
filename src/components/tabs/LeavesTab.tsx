import React from 'react';
import { Employee } from '../../types';
import { Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';

interface LeavesTabProps {
  employee: Employee;
}

const LeavesTab: React.FC<LeavesTabProps> = ({ employee }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalLeaveDays = employee.leaves
    .filter(leave => leave.status === 'approved')
    .reduce((total, leave) => total + leave.days, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Calendar className="w-6 h-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Leave History</h2>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg">
          <span className="text-sm text-blue-800 font-medium">
            Total Days Used: {totalLeaveDays}
          </span>
        </div>
      </div>
      
      <div className="space-y-4">
        {employee.leaves.map((leave) => (
          <div key={leave.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  {getStatusIcon(leave.status)}
                  <h3 className="font-semibold text-gray-900 ml-2">{leave.type}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(leave.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">End Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(leave.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-medium text-gray-900">{leave.days} days</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Reason</p>
                  <p className="text-gray-700">{leave.reason}</p>
                </div>
              </div>
              
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                {leave.status.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {employee.leaves.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No leave records found</p>
        </div>
      )}
    </div>
  );
};

export default LeavesTab;