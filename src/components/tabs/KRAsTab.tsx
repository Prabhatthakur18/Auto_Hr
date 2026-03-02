import React from 'react';
import { Employee } from '../../types';
import { Target, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface KRAsTabProps {
  employee: Employee;
}

const KRAsTab: React.FC<KRAsTabProps> = ({ employee }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Target className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Key Result Areas (KRAs)</h2>
      </div>
      
      <div className="space-y-4">
        {employee.kras.map((kra) => (
          <div key={kra.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  {getStatusIcon(kra.status)}
                  <h3 className="font-semibold text-gray-900 ml-2">{kra.title}</h3>
                </div>
                <p className="text-gray-700 mb-4">{kra.description}</p>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-1" />
                  Target: {kra.target}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(kra.status)}`}>
                {kra.status.replace('-', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {employee.kras.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No KRAs assigned yet</p>
        </div>
      )}
    </div>
  );
};

export default KRAsTab;