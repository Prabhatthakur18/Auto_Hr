import React from 'react';
import { Company } from '../types';
import { Building, ChevronDown } from 'lucide-react';

interface CompanySelectorProps {
  companies: Company[];
  selectedCompany: Company | null;
  onSelectCompany: (company: Company | null) => void;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({ 
  companies, 
  selectedCompany, 
  onSelectCompany 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <Building className="w-5 h-5 mr-2 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Select Company</h2>
      </div>
      
      <div className="relative">
        <select
          value={selectedCompany?.id || ''}
          onChange={(e) => {
            const company = companies.find(c => c.id === e.target.value) || null;
            onSelectCompany(company);
          }}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer text-gray-900"
        >
          <option value="">Choose a company...</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name} - {company.industry}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
      
      {selectedCompany && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900">{selectedCompany.name}</h3>
          <p className="text-sm text-blue-700 mt-1">{selectedCompany.description}</p>
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-blue-600">
            <span>📍 {selectedCompany.location}</span>
            <span>👥 {selectedCompany.employees} employees</span>
            <span>📅 Est. {selectedCompany.established}</span>
            <span>💰 {selectedCompany.revenue}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySelector;