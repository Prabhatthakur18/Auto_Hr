import React from 'react';
import { Employee } from '../../types';
import { TrendingUp, Target } from 'lucide-react';

interface KPIsTabProps {
  employee: Employee;
}

const KPIsTab: React.FC<KPIsTabProps> = ({ employee }) => {
  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <TrendingUp className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Key Performance Indicators (KPIs)</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {employee.kpis.map((kpi) => {
          const percentage = getProgressPercentage(kpi.current, kpi.target);
          
          return (
            <div key={kpi.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{kpi.metric}</h3>
                <span className="text-sm text-gray-500">{kpi.period}</span>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {kpi.current} {kpi.unit}
                  </span>
                  <span className="text-sm text-gray-600">
                    Target: {kpi.target} {kpi.unit}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">{percentage.toFixed(1)}% of target</span>
                  {percentage >= 100 && (
                    <span className="text-sm text-green-600 font-medium">Target achieved!</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {employee.kpis.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No KPIs defined yet</p>
        </div>
      )}
    </div>
  );
};

export default KPIsTab;