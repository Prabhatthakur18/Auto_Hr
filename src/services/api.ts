const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Centralized API client for all backend calls.
 * Automatically attaches JWT token from localStorage.
 * Handles errors consistently.
 */

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('token');

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
    };

    // Don't set Content-Type for FormData (browser sets multipart boundary)
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
    });

    const json = await response.json() as ApiResponse<T>;

    if (!response.ok) {
        throw new Error(json.error || `Request failed with status ${response.status}`);
    }

    return json;
}

// ─── Auth ────────────────────────────────────────────────────

export const authApi = {
    login: (username: string, password: string) =>
        request<{ token: string; user: AuthUser }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),

    me: () => request<{ user: AuthUser }>('/auth/me'),

    logout: () => request('/auth/logout', { method: 'POST' }),
};

// ─── Employees ───────────────────────────────────────────────

export const employeeApi = {
    list: (params?: Record<string, string>) => {
        const query = params ? `?${new URLSearchParams(params)}` : '';
        return request<{ employees: Employee[]; pagination: Pagination }>(`/employees${query}`);
    },

    get: (id: number) => request<{ employee: EmployeeDetail }>(`/employees/${id}`),

    create: (data: Partial<Employee> & { createUser?: boolean; username?: string; password?: string; role?: string }) =>
        request<{ employee: Employee }>('/employees', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: number, data: Partial<Employee>) =>
        request<{ employee: Employee }>(`/employees/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: number) =>
        request(`/employees/${id}`, { method: 'DELETE' }),

    team: (id: number) =>
        request<{ team: Employee[]; count: number }>(`/employees/${id}/team`),
};

// ─── Leaves ──────────────────────────────────────────────────

export const leaveApi = {
    list: (params?: Record<string, string>) => {
        const query = params ? `?${new URLSearchParams(params)}` : '';
        return request<{ leaves: Leave[] }>(`/leaves${query}`);
    },

    apply: (data: { type: string; startDate: string; endDate: string; days: number; reason?: string }) =>
        request<{ leave: Leave }>('/leaves', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    approve: (id: number) =>
        request<{ leave: Leave }>(`/leaves/${id}/approve`, { method: 'PUT' }),

    reject: (id: number, reason?: string) =>
        request<{ leave: Leave }>(`/leaves/${id}/reject`, {
            method: 'PUT',
            body: JSON.stringify({ reason }),
        }),

    cancel: (id: number) =>
        request(`/leaves/${id}`, { method: 'DELETE' }),
};

// ─── Attendance ──────────────────────────────────────────────

export const attendanceApi = {
    get: (employeeId: number, params?: Record<string, string>) => {
        const query = params ? `?${new URLSearchParams(params)}` : '';
        return request<{ attendance: Attendance[]; summary: AttendanceSummary }>(
            `/attendance/${employeeId}${query}`
        );
    },

    uploadBiometric: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return request<{ totalRecords: number; processedDays: number; inserted: number }>('/attendance/upload/biometric', {
            method: 'POST',
            body: formData,
        });
    },

    uploadExcel: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return request<{ totalRows: number; inserted: number; skipped: number }>('/attendance/upload/excel', {
            method: 'POST',
            body: formData,
        });
    },

    manualEntry: (data: { employeeId: number; date: string; checkIn?: string; checkOut?: string; status?: string }) =>
        request<{ attendance: Attendance }>('/attendance/manual', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// ─── Salary ──────────────────────────────────────────────────

export const salaryApi = {
    getBreakdown: (employeeId: number) =>
        request<{ breakdowns: SalaryBreakdown[]; totals: SalaryTotals | null }>(`/salary/breakdown/${employeeId}`),

    createBreakdown: (data: Partial<SalaryBreakdown> & { employeeId: number; effectiveFrom: string }) =>
        request<{ breakdown: SalaryBreakdown }>('/salary/breakdown', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getSlips: (employeeId: number) =>
        request<{ slips: SalarySlip[] }>(`/salary/slips/${employeeId}`),

    generateSlip: (data: { employeeId: number; month: string; workingDays: number; daysPresent: number }) =>
        request<{ slip: SalarySlip }>('/salary/slips/generate', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// ─── Announcements ───────────────────────────────────────────

export const announcementApi = {
    list: () => request<{ announcements: Announcement[] }>('/announcements'),

    create: (data: FormData) =>
        request<{ announcement: Announcement }>('/announcements', {
            method: 'POST',
            body: data,
        }),

    update: (id: number, data: Partial<Announcement>) =>
        request<{ announcement: Announcement }>(`/announcements/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: number) =>
        request(`/announcements/${id}`, { method: 'DELETE' }),
};

// ─── Types ───────────────────────────────────────────────────

export interface AuthUser {
    id: number;
    username: string;
    role: 'EMPLOYEE' | 'MANAGER' | 'HR';
    employeeId: number | null;
    employee: {
        id: number;
        name: string;
        position: string | null;
        department: string | null;
        email: string | null;
        avatar: string | null;
    } | null;
}

export interface Employee {
    id: number;
    biometricId: number | null;
    name: string;
    position: string | null;
    department: string | null;
    email: string | null;
    phone: string | null;
    joinDate: string | null;
    managerId: number | null;
    avatar: string | null;
    employeeType: string | null;
    manager?: { id: number; name: string };
}

export interface EmployeeDetail extends Employee {
    bio: string | null;
    skills: string[] | null;
    experience: string | null;
    education: string | null;
    isActive: boolean;
    directReports: Employee[];
    user: { id: number; username: string; role: string } | null;
}

export interface Leave {
    id: number;
    employeeId: number;
    type: string;
    startDate: string;
    endDate: string;
    days: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reason: string | null;
    createdAt: string;
    employee?: { id: number; name: string; department: string | null };
    approvedBy?: { id: number; username: string } | null;
}

export interface Attendance {
    id: number;
    employeeId: number;
    date: string;
    day: string | null;
    checkIn: string | null;
    checkOut: string | null;
    totalWorkingHours: string | null;
    isLate: boolean;
    lateBy: string | null;
    overtime: boolean;
    otTime: string | null;
    status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY';
}

export interface AttendanceSummary {
    total: number;
    present: number;
    absent: number;
    halfDay: number;
    onLeave: number;
    holiday: number;
    lateDays: number;
    overtimeDays: number;
}

export interface SalaryBreakdown {
    id: number;
    employeeId: number;
    basicSalary: number;
    hra: number;
    da: number;
    ta: number;
    medicalAllowance: number;
    specialAllowance: number;
    pf: number;
    esi: number;
    tax: number;
    otherDeductions: number;
    effectiveFrom: string;
}

export interface SalaryTotals {
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
}

export interface SalarySlip {
    id: number;
    employeeId: number;
    month: string;
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    workingDays: number;
    daysPresent: number;
    breakdownJson: Record<string, number>;
    generatedAt: string;
}

export interface Announcement {
    id: number;
    title: string;
    content: string | null;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    attachmentUrl: string | null;
    isActive: boolean;
    createdAt: string;
    expiresAt: string | null;
    createdBy?: { username: string };
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
