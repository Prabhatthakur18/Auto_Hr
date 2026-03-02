import React from 'react';
import { Employee } from '../../types';
import { Map, CheckCircle, Clock, Target } from 'lucide-react';

interface RoadmapTabProps {
  employee: Employee;
}

const RoadmapTab: React.FC<RoadmapTabProps> = ({ employee }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'current':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'next':
        return <Clock className="w-6 h-6 text-blue-500" />;
      default:
        return <Target className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return 'border-green-500 bg-green-50';
      case 'next':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Map className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Career Roadmap</h2>
      </div>
      
      <div className="space-y-6">
        {employee.careerRoadmap.map((step, index) => (
          <div key={step.id} className="relative">
            {index !== employee.careerRoadmap.length - 1 && (
              <div className="absolute left-6 top-16 w-0.5 h-16 bg-gray-300"></div>
            )}
            
            <div className={`border-2 rounded-lg p-6 ${getStatusColor(step.status)}`}>
              <div className="flex items-start space-x-4">
                {getStatusIcon(step.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{step.position}</h3>
                    <span className="text-sm text-gray-600">{step.timeline}</span>
                  </div>
                  
                  <h4 className="font-medium text-gray-800 mb-2">Requirements:</h4>
                  <ul className="space-y-1">
                    {step.requirements.map((req, reqIndex) => (
                      <li key={reqIndex} className="text-sm text-gray-700 flex items-center">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {employee.careerRoadmap.length === 0 && (
        <div className="text-center py-12">
          <Map className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No career roadmap defined yet</p>
        </div>
      )}
    </div>
  );
};

export default RoadmapTab;