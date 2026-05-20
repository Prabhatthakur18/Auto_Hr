import React from 'react';
import { Employee } from '../../types';
import { Mail, Phone, Calendar, Award } from 'lucide-react';

interface AboutTabProps {
  employee: Employee;
}

const AboutTab: React.FC<AboutTabProps> = ({ employee }) => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start space-x-6">
        <img
          src={employee.avatar}
          alt={employee.name}
          className="w-24 h-24 rounded-full object-cover"
        />
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{employee.name}</h2>
          <p className="text-lg text-gray-600">{employee.position}</p>
          <p className="text-gray-500">{employee.department}</p>
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-4 h-4 mr-2" />
              {employee.email}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="w-4 h-4 mr-2" />
              {employee.phone}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              Joined {new Date(employee.joinDate).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Biography</h3>
          <p className="text-gray-700 text-sm leading-relaxed">{employee.about.bio}</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Education</h3>
          <p className="text-gray-700 text-sm">{employee.about.education}</p>
          
          <h3 className="font-semibold text-gray-900 mb-3 mt-4">Experience</h3>
          <p className="text-gray-700 text-sm">{employee.about.experience}</p>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {employee.about.skills.map((skill, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AboutTab;