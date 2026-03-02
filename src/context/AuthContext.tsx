import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'HR' | 'MANAGEMENT' | 'EMPLOYEE';

export interface User {
  username: string;
  role: UserRole;
  permissions: {
    canAddCompany: boolean;
    canEditCompany: boolean;
    canDeleteCompany: boolean;
    canAddEmployee: boolean;
    canEditEmployee: boolean;
    canDeleteEmployee: boolean;
    canEditEmployeeAbout: boolean;
    canEditEmployeeLeaves: boolean;
    canEditEmployeeBasic: boolean;
    canEditEmployeeAll: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const login = (username: string, password: string): boolean => {
    let userRole: UserRole | null = null;
    
    // Check credentials
    if (username === 'hr' && password === 'hr123') {
      userRole = 'HR';
    } else if (username === 'man' && password === 'man123') {
      userRole = 'MANAGEMENT';
    } else if (username === 'emp' && password === 'emp123') {
      userRole = 'EMPLOYEE';
    }

    if (userRole) {
      // Define permissions based on role
      const permissions = {
        HR: {
          canAddCompany: true,
          canEditCompany: true,
          canDeleteCompany: false,
          canAddEmployee: true,
          canEditEmployee: true,
          canDeleteEmployee: false,
          canEditEmployeeAbout: true,
          canEditEmployeeLeaves: true,
          canEditEmployeeBasic: true,
          canEditEmployeeAll: false,
        },
        MANAGEMENT: {
          canAddCompany: true,
          canEditCompany: true,
          canDeleteCompany: true,
          canAddEmployee: true,
          canEditEmployee: true,
          canDeleteEmployee: true,
          canEditEmployeeAbout: true,
          canEditEmployeeLeaves: true,
          canEditEmployeeBasic: true,
          canEditEmployeeAll: true,
        },
        EMPLOYEE: {
          canAddCompany: false,
          canEditCompany: false,
          canDeleteCompany: false,
          canAddEmployee: false,
          canEditEmployee: false,
          canDeleteEmployee: false,
          canEditEmployeeAbout: false,
          canEditEmployeeLeaves: false,
          canEditEmployeeBasic: false,
          canEditEmployeeAll: false,
        },
      };

      const newUser: User = {
        username,
        role: userRole,
        permissions: permissions[userRole],
      };

      setUser(newUser);
      setIsLoggedIn(true);
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
