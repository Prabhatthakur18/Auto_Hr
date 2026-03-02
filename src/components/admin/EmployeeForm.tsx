import React, { useState } from 'react';
import { Employee, Company } from '../../types';
import { Save, X, Plus, Trash2 } from 'lucide-react';

interface UserPermissions {
  canAddCompany: boolean;
  canEditCompany: boolean;
  canDeleteCompany: boolean;
  canAddEmployee: boolean;
  canEditEmployee: boolean;
  canDeleteEmployee: boolean;
  canEditEmployeeAbout: boolean;
  canEditEmployeeLeaves: boolean;
  canEditEmployeeAll: boolean;
  canEditEmployeeBasic: boolean;
}

interface EmployeeFormProps {
  employee: Employee | null;
  companies: Company[];
  onSave: (employee: Employee) => void;
  onCancel: () => void;
  userPermissions?: UserPermissions;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ 
  employee, 
  companies, 
  onSave, 
  onCancel, 
  userPermissions 
}) => {
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
    name: employee?.name || '',
    position: employee?.position || '',
    department: employee?.department || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    joinDate: employee?.joinDate || '',
    companyId: employee?.companyId || '',
    avatar: employee?.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    about: {
      bio: employee?.about.bio || '',
      skills: employee?.about.skills || [],
      experience: employee?.about.experience || '',
      education: employee?.about.education || ''
    },
    kras: employee?.kras || [],
    kpis: employee?.kpis || [],
    careerRoadmap: employee?.careerRoadmap || [],
    reviews: {
      internal: employee?.reviews.internal || [],
      external: employee?.reviews.external || []
    },
    leaves: employee?.leaves || []
  });

  const [newSkill, setNewSkill] = useState('');

  // Check if user can edit all fields or just specific sections
  const canEditAll = userPermissions?.canEditEmployeeAll ?? true;
  const canEditAbout = userPermissions?.canEditEmployeeAbout ?? true;
  const canEditLeaves = userPermissions?.canEditEmployeeLeaves ?? true;
  const canEditBasic = userPermissions?.canEditEmployeeBasic ?? true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: employee?.id || '',
      ...formData
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('about.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        about: {
          ...prev.about,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setFormData(prev => ({
        ...prev,
        about: {
          ...prev.about,
          skills: [...prev.about.skills, newSkill.trim()]
        }
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (index: number) => {
    setFormData(prev => ({
      ...prev,
      about: {
        ...prev.about,
        skills: prev.about.skills.filter((_, i) => i !== index)
      }
    }));
  };

  const addKRA = () => {
    setFormData(prev => ({
      ...prev,
      kras: [
        ...prev.kras,
        {
          id: Date.now().toString(),
          title: '',
          description: '',
          target: '',
          status: 'pending' as const
        }
      ]
    }));
  };

  const removeKRA = (index: number) => {
    setFormData(prev => ({
      ...prev,
      kras: prev.kras.filter((_, i) => i !== index)
    }));
  };

  const updateKRA = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      kras: prev.kras.map((kra, i) => 
        i === index ? { ...kra, [field]: value } : kra
      )
    }));
  };

  const addKPI = () => {
    setFormData(prev => ({
      ...prev,
      kpis: [
        ...prev.kpis,
        {
          id: Date.now().toString(),
          metric: '',
          target: 0,
          current: 0,
          unit: '',
          period: 'Monthly'
        }
      ]
    }));
  };

  const removeKPI = (index: number) => {
    setFormData(prev => ({
      ...prev,
      kpis: prev.kpis.filter((_, i) => i !== index)
    }));
  };

  const updateKPI = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      kpis: prev.kpis.map((kpi, i) => 
        i === index ? { ...kpi, [field]: value } : kpi
      )
    }));
  };

  const addCareerMilestone = () => {
    setFormData(prev => ({
      ...prev,
      careerRoadmap: [
        ...prev.careerRoadmap,
        {
          id: Date.now().toString(),
          position: '',
          timeline: '',
          requirements: [],
          status: 'current' as const
        }
      ]
    }));
  };

  const removeCareerMilestone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      careerRoadmap: prev.careerRoadmap.filter((_, i) => i !== index)
    }));
  };

  const updateCareerMilestone = (index: number, field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      careerRoadmap: prev.careerRoadmap.map((milestone, i) => 
        i === index ? { ...milestone, [field]: value } : milestone
      )
    }));
  };

  const addLeave = () => {
    setFormData(prev => ({
      ...prev,
      leaves: [
        ...prev.leaves,
        {
          id: Date.now().toString(),
          type: 'annual',
          startDate: '',
          endDate: '',
          days: 1,
          status: 'pending',
          reason: ''
        }
      ]
    }));
  };

  const removeLeave = (index: number) => {
    setFormData(prev => ({
      ...prev,
      leaves: prev.leaves.filter((_, i) => i !== index)
    }));
  };

  const updateLeave = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      leaves: prev.leaves.map((leave, i) => 
        i === index ? { ...leave, [field]: value } : leave
      )
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={!canEditBasic}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Position *
          </label>
          <input
            type="text"
            name="position"
            value={formData.position}
            onChange={handleChange}
            required
            disabled={!canEditBasic}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department *
          </label>
          <input
            type="text"
            name="department"
            value={formData.department}
            onChange={handleChange}
            required
            disabled={!canEditBasic}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company *
          </label>
          <select
            name="companyId"
            value={formData.companyId}
            onChange={handleChange}
            required
            disabled={!canEditBasic}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">Select a company</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={!canEditBasic}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            disabled={!canEditBasic}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Join Date
          </label>
          <input
            type="date"
            name="joinDate"
            value={formData.joinDate}
            onChange={handleChange}
            disabled={!canEditBasic}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>
      </div>

      {/* About Section - Always editable for HR */}
      {canEditAbout && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">About</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                name="about.bio"
                value={formData.about.bio}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Experience
              </label>
              <textarea
                name="about.experience"
                value={formData.about.experience}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Education
              </label>
              <textarea
                name="about.education"
                value={formData.about.education}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skills
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.about.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaves Section - Always editable for HR */}
      {canEditLeaves && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Leaves</h3>
          <div className="space-y-4">
            {formData.leaves.map((leave, index) => (
              <div key={leave.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Leave Type
                    </label>
                    <select
                      value={leave.type}
                      onChange={(e) => updateLeave(index, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="annual">Annual Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="personal">Personal Leave</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={leave.status}
                      onChange={(e) => updateLeave(index, 'status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={leave.startDate}
                      onChange={(e) => updateLeave(index, 'startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={leave.endDate}
                      onChange={(e) => updateLeave(index, 'endDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={leave.days}
                      onChange={(e) => updateLeave(index, 'days', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <textarea
                    value={leave.reason}
                    onChange={(e) => updateLeave(index, 'reason', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeLeave(index)}
                  className="mt-2 text-red-600 hover:text-red-800 text-sm"
                >
                  Remove Leave
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addLeave}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Leave
            </button>
          </div>
        </div>
      )}

      {/* Other sections - Only editable for MANAGEMENT */}
      {canEditAll && (
        <>
          {/* KRAs Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Key Result Areas (KRAs)</h3>
            <div className="space-y-4">
              {formData.kras.map((kra, index) => (
                <div key={kra.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={kra.title}
                        onChange={(e) => updateKRA(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={kra.status}
                        onChange={(e) => updateKRA(index, 'status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={kra.description}
                      onChange={(e) => updateKRA(index, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target
                    </label>
                    <input
                      type="text"
                      value={kra.target}
                      onChange={(e) => updateKRA(index, 'target', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeKRA(index)}
                    className="mt-2 text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove KRA
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addKRA}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add KRA
              </button>
            </div>
          </div>

          {/* KPIs Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Key Performance Indicators (KPIs)</h3>
            <div className="space-y-4">
              {formData.kpis.map((kpi, index) => (
                <div key={kpi.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={kpi.metric}
                        onChange={(e) => updateKPI(index, 'metric', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={kpi.unit}
                        onChange={(e) => updateKPI(index, 'unit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target
                      </label>
                      <input
                        type="number"
                        value={kpi.target}
                        onChange={(e) => updateKPI(index, 'target', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current
                      </label>
                      <input
                        type="number"
                        value={kpi.current}
                        onChange={(e) => updateKPI(index, 'current', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Period
                      </label>
                      <select
                        value={kpi.period}
                        onChange={(e) => updateKPI(index, 'period', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Annually">Annually</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeKPI(index)}
                    className="mt-2 text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove KPI
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addKPI}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add KPI
              </button>
            </div>
          </div>

          {/* Career Roadmap Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Career Roadmap</h3>
            <div className="space-y-4">
              {formData.careerRoadmap.map((milestone, index) => (
                <div key={milestone.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Position
                      </label>
                      <input
                        type="text"
                        value={milestone.position}
                        onChange={(e) => updateCareerMilestone(index, 'position', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={milestone.status}
                        onChange={(e) => updateCareerMilestone(index, 'status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="current">Current</option>
                        <option value="planned">Planned</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Timeline
                      </label>
                      <input
                        type="text"
                        value={milestone.timeline}
                        onChange={(e) => updateCareerMilestone(index, 'timeline', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Requirements
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {milestone.requirements.map((req, reqIndex) => (
                        <span
                          key={reqIndex}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                        >
                          {req}
                          <button
                            type="button"
                            onClick={() => updateCareerMilestone(index, 'requirements', milestone.requirements.filter((_, i) => i !== reqIndex))}
                            className="ml-2 text-purple-600 hover:text-purple-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={''} // This input is for adding new requirements
                      onChange={(e) => {
                        if (e.target.value.trim()) {
                          updateCareerMilestone(index, 'requirements', [...milestone.requirements, e.target.value.trim()]);
                        }
                      }}
                      placeholder="Add a requirement"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCareerMilestone(index)}
                    className="mt-2 text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove Milestone
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCareerMilestone}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Career Milestone
              </button>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Employee
        </button>
      </div>
    </form>
  );
};

export default EmployeeForm;