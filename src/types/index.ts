export interface Company {
  id: string;
  name: string;
  industry: string;
  employees: number;
  location: string;
  established: string;
  revenue: string;
  description: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  joinDate: string;
  companyId: string;
  avatar: string;
  about: {
    bio: string;
    skills: string[];
    experience: string;
    education: string;
  };
  kras: Array<{
    id: string;
    title: string;
    description: string;
    target: string;
    status: 'pending' | 'in-progress' | 'completed';
  }>;
  kpis: Array<{
    id: string;
    metric: string;
    target: number;
    current: number;
    unit: string;
    period: string;
  }>;
  careerRoadmap: Array<{
    id: string;
    position: string;
    timeline: string;
    requirements: string[];
    status: 'current' | 'next' | 'future';
  }>;
  reviews: {
    internal: Array<{
      id: string;
      reviewer: string;
      rating: number;
      feedback: string;
      date: string;
    }>;
    external: Array<{
      id: string;
      client: string;
      project: string;
      rating: number;
      feedback: string;
      date: string;
    }>;
  };
  leaves: Array<{
    id: string;
    type: string;
    startDate: string;
    endDate: string;
    days: number;
    status: 'approved' | 'pending' | 'rejected';
    reason: string;
  }>;
}