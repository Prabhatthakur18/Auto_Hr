import React from 'react';
import { User, Target, TrendingUp, Map, MessageSquare, Calendar } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const tabs: Tab[] = [
  { id: 'about', label: 'About', icon: <User className="w-4 h-4" /> },
  { id: 'kras', label: 'KRAs', icon: <Target className="w-4 h-4" /> },
  { id: 'kpis', label: 'KPIs', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'roadmap', label: 'Career Roadmap', icon: <Map className="w-4 h-4" /> },
  { id: 'reviews', label: 'Reviews', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'leaves', label: 'Leaves', icon: <Calendar className="w-4 h-4" /> },
];

const ProfileTabs: React.FC<ProfileTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="border-b border-gray-200 bg-white rounded-t-lg">
      <nav className="flex space-x-8 px-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default ProfileTabs;