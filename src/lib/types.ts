export type Role = "admin" | "hr" | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  employeeId: string | null;
  mustChangePassword: boolean;
  companyId?: string;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  joiningDate: string;
  exitDate?: string;
  companyName?: string;
  createdByName?: string;
  joining_date?: string;
  basicSalary?: number;
  allowances?: number;
  phone?: string;
  address?: string;
  status: string;
  loginUserId?: string | null;
  loginActive?: boolean;
}

export interface LeaveRequest {
  id: string;
  name?: string;
  department?: string;
  type: string;
  startDate?: string;
  endDate?: string;
  start_date?: string;
  end_date?: string;
  days: number;
  reason: string;
  status: string;
  comment?: string;
}

export interface DashboardData {
  company: string;
  role: Role;
  headcount: number;
  hrCount?: number;
  present: number;
  late: number;
  halfDay: number;
  onLeave: number;
  pendingLeaves: number;
  analytics: any;
  personal?: {
    hours: number;
    lateCount: number;
    leaveBalance: any[];
    lastPayslip: any;
  };
  recentActivity: any[];
  announcements: any[];
}
