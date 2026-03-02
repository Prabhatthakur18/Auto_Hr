import { Company, Employee } from '../types';

export const companies: Company[] = [
  {
    id: '1',
    name: 'RP AUTOSTYLES',
    industry: 'AUTOMOTIVE',
    employees: 120,
    location: 'NOIDA, UTTAR PRADESH',
    established: '2015',
    revenue: '50M',
    description: 'Leading Seat Cover Manufacturing Company Deals in the Automotive Seat Covers With The Best Quality Materials.'
  },
  {
    id: '2',
    name: 'VIN COORPORATION',
    industry: 'MANUFACTURING',
    employees: 280,
    location: 'DEHRADUN, UTTRAKHAND',
    established: '1998',
    revenue: '120M',
    description: 'Automotive Seat Cover manufacturer with operations across Across India and Saudi Arabia.'
  },
  {
    id: '3',
    name: 'YS CORPORATION',
    industry: 'MANUFACTURING',
    employees: 95,
    location: 'DEHRADUN, UTTRAKHAND',
    established: '2005',
    revenue: '80M',
    description: 'YS Corporations Deals in the indias Best Seat Original Equipment Manufacturer'
  },
    {
    id: '4',
    name: 'SRN ENTERPRISES',
    industry: 'MANUFACTURING',
    employees:120,
    location: 'DEHRADUN, UTTRAKHAND',
    established: '2015',
    revenue: '70M',
    description: 'SRN Corporations Deals in the indias Best Seat Original Equipment Manufacturer'
  },
  
    {
    id: '5',
    name: 'VIN ENTERPRISES',
    industry: 'MANUFACTURING',
    employees: 130,
    location: 'DEHRADUN, UTTRAKHAND',
    established: '2010',
    revenue: '100M',
    description: 'VIN EnterPrises Deals in the indias Best Seat Original Equipment Manufacturer'
  },
    {
    id: '6',
    name: 'AMATO AUTOMOTIVE PVT LTD',
    industry: 'AUTOMOTIVE',
    employees: 20,
    location: 'DEHRADUN, UTTRAKHAND',
    established: '2020',
    revenue: '180M',
    description: 'YS Corporations Deals in the indias Best Seat Original Equipment Manufacturer'
  }
];

export const employees: Employee[] = [
  {
    id: '1',
    name: 'Prabhat Thakur',
    position: 'Software Engineer',
    department: 'Engineering',
    email: 'prabhat.thakur@autoform.com',
    phone: '+1 (555) 123-4567',
    joinDate: '2024-12-8',
    companyId: '1',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    about: {
      bio: 'Experienced software engineer with 1+ years in full-stack development. Passionate about creating scalable solutions and mentoring junior developers.',
      skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'Three.js', 'Java Script', 'Java','WordPress', 'PHP',],
      experience: '8 Months in software development, previously at Railware and startups',
      education: 'B.tech Computer Science and Engineering'
    },
    kras: [
      {
        id: '1',
        title: 'Lead Platform Migration',
        description: 'Migrate legacy system to cloud-native architecture',
        target: 'Q2 2024',
        status: 'in-progress'
      },
      {
        id: '2',
        title: 'Team Performance',
        description: 'Improve team velocity by 25%',
        target: 'End of 2024',
        status: 'Done'
      }
    ],
    kpis: [
      {
        id: '1',
        metric: 'Code Review Turnaround',
        target: 24,
        current: 18,
        unit: 'hours',
        period: 'Monthly'
      },
      {
        id: '2',
        metric: 'Bug Resolution Rate',
        target: 95,
        current: 97,
        unit: '%',
        period: 'Monthly'
      }
    ],
    careerRoadmap: [
      {
        id: '1',
        position: 'Software Engineer',
        timeline: 'Current',
        requirements: ['Technical Leadership', 'Mentoring'],
        status: 'current'
      },
      {
        id: '2',
        position: 'Senior Software Engineer',
        timeline: '6-12 months',
        requirements: ['Architecture Design', 'Cross-team Collaboration'],
        status: 'next'
      },
      {
        id: '3',
        position: 'Principal Engineer',
        timeline: '2-3 years',
        requirements: ['Technology Strategy', 'Industry Recognition'],
        status: 'future'
      }
    ],
    reviews: {
      internal: [
        {
          id: '1',
          reviewer: 'Mike Chen (Manager)',
          rating: 4.8,
          feedback: 'Exceptional technical skills and great team player. Consistently delivers high-quality code.',
          date: '2024-01-15'
        }
      ],
      external: [
        {
          id: '1',
          client: 'Enterprise Corp',
          project: 'E-commerce Platform',
          rating: 5.0,
          feedback: 'Outstanding work on the platform redesign. Exceeded expectations.',
          date: '2024-02-20'
        }
      ]
    },
    leaves: [
      {
        id: '1',
        type: 'Casual Leave',
        startDate: '2024-03-15',
        endDate: '2024-03-22',
        days: 6,
        status: 'approved',
        reason: 'Family vacation'
      },
      {
        id: '2',
        type: 'Sick Leave',
        startDate: '2024-01-08',
        endDate: '2024-01-10',
        days: 3,
        status: 'approved',
        reason: 'Medical appointment'
      }
    ]
  },
  {
    id: '2',
    name: 'David Rodriguez',
    position: 'Marketing Manager',
    department: 'Marketing',
    email: 'david.rodriguez@techcorp.com',
    phone: '+1 (555) 234-5678',
    joinDate: '2020-08-10',
    companyId: '1',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    about: {
      bio: 'Creative marketing professional with expertise in digital campaigns and brand strategy. Led successful product launches and market expansion initiatives.',
      skills: ['Digital Marketing', 'Brand Strategy', 'Analytics', 'Content Creation', 'SEO/SEM'],
      experience: '6 years in marketing, previously at advertising agencies',
      education: 'MBA Marketing, UC Berkeley'
    },
    kras: [
      {
        id: '1',
        title: 'Brand Awareness Campaign',
        description: 'Increase brand recognition by 40%',
        target: 'Q3 2024',
        status: 'in-progress'
      }
    ],
    kpis: [
      {
        id: '1',
        metric: 'Lead Generation',
        target: 500,
        current: 620,
        unit: 'leads',
        period: 'Monthly'
      }
    ],
    careerRoadmap: [
      {
        id: '1',
        position: 'Marketing Manager',
        timeline: 'Current',
        requirements: ['Campaign Management', 'Team Leadership'],
        status: 'current'
      }
    ],
    reviews: {
      internal: [
        {
          id: '1',
          reviewer: 'Lisa Park (Director)',
          rating: 4.6,
          feedback: 'Strong strategic thinking and excellent execution of marketing campaigns.',
          date: '2024-01-20'
        }
      ],
      external: []
    },
    leaves: [
      {
        id: '1',
        type: 'Casual Leave',
        startDate: '2024-04-01',
        endDate: '2024-04-03',
        days: 3,
        status: 'pending',
        reason: 'Personal matters'
      }
    ]
  }
];