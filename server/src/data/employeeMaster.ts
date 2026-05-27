export interface MasterEmployeeRecord {
    biometricId: number;
    name: string;
    department: string;
}

// Baseline biometric master used to bootstrap the employee directory.
// Runtime attendance imports still map against Employee.biometricId from the DB.
export const masterEmployees: MasterEmployeeRecord[] = [
    { biometricId: 2, name: 'Rishi', department: 'Operations' },
    { biometricId: 3, name: 'Ankur Jain', department: 'Operations' },
    { biometricId: 4, name: 'Santosh Sharma', department: 'Operations' },
    { biometricId: 5, name: 'Gaurav', department: 'Operations' },
    { biometricId: 7, name: 'Gunjan', department: 'Operations' },
    { biometricId: 9, name: 'Aarti', department: 'Operations' },
    { biometricId: 10, name: 'Akansha Bajpai', department: 'Operations' },
    { biometricId: 11, name: 'Chirag Chaddha', department: 'Operations' },
    { biometricId: 14, name: 'Sumit', department: 'Operations' },
    { biometricId: 15, name: 'Sanjay Dwivedi', department: 'Operations' },
    { biometricId: 17, name: 'Himanshu Gandhi', department: 'Operations' },
    { biometricId: 19, name: 'Sandhya Jha', department: 'Operations' },
    { biometricId: 20, name: 'Vijaya', department: 'Operations' },
    { biometricId: 26, name: 'Saurabh', department: 'Operations' },
    { biometricId: 31, name: 'Anshika Singh', department: 'Operations' },
    { biometricId: 32, name: 'Prabhat', department: 'Engineering' },
    { biometricId: 34, name: 'Pankaj Vij', department: 'Operations' },
    { biometricId: 35, name: 'Kiran', department: 'Operations' },
    { biometricId: 36, name: 'Hardevi', department: 'Operations' },
    { biometricId: 37, name: 'Sadhana', department: 'Operations' },
    { biometricId: 38, name: 'Kanchani', department: 'Operations' },
    { biometricId: 40, name: 'Naman', department: 'Operations' },
    { biometricId: 41, name: 'Ashish Rai', department: 'Operations' },
    { biometricId: 42, name: 'Bharat Maheshwari', department: 'Engineering' },
    { biometricId: 43, name: 'Trisha Kushwaha', department: 'Operations' },
    { biometricId: 45, name: 'Kashif', department: 'Operations' },
];
