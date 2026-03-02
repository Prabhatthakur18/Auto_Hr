import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { employees } from '../data/mockData';
import Header from '../components/Header';
import ProfileTabs from '../components/ProfileTabs';
import AboutTab from '../components/tabs/AboutTab';
import KRAsTab from '../components/tabs/KRAsTab';
import KPIsTab from '../components/tabs/KPIsTab';
import RoadmapTab from '../components/tabs/RoadmapTab';
import ReviewsTab from '../components/tabs/ReviewsTab';
import LeavesTab from '../components/tabs/LeavesTab';

const Profile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('about');

  const employee = employees.find(emp => emp.id === id);

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Employee not found</h2>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'about':
        return <AboutTab employee={employee} />;
      case 'kras':
        return <KRAsTab employee={employee} />;
      case 'kpis':
        return <KPIsTab employee={employee} />;
      case 'roadmap':
        return <RoadmapTab employee={employee} />;
      case 'reviews':
        return <ReviewsTab employee={employee} />;
      case 'leaves':
        return <LeavesTab employee={employee} />;
      default:
        return <AboutTab employee={employee} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Profile</h1>
            <p className="text-gray-600 mt-1">Complete employee information and performance data</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="bg-gray-50">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;