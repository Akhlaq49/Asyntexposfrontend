import api from './api';

// ─── Interfaces ───

export interface Department {
  id: number;
  name: string;
  hodId?: number;
  hodName?: string;
  hodPicture?: string;
  description?: string;
  status: string;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
}
export interface CreateDepartment {
  name: string;
  hodId?: number;
  description?: string;
  status: string;
  isActive: boolean;
}

export interface Designation {
  id: number;
  name: string;
  departmentId?: number;
  departmentName?: string;
  description?: string;
  status: string;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
}
export interface CreateDesignation {
  name: string;
  departmentId?: number;
  description?: string;
  status: string;
  isActive: boolean;
}

export interface Shift {
  id: number;
  name: string;
  startTime?: string;
  endTime?: string;
  weekOff?: string;
  status: string;
  isActive: boolean;
  createdAt: string;
}
export interface CreateShift {
  name: string;
  startTime?: string;
  endTime?: string;
  weekOff?: string;
  status: string;
  isActive: boolean;
}

export interface LeaveType {
  id: number;
  name: string;
  quota: number;
  status: string;
  isActive: boolean;
  createdAt: string;
}
export interface CreateLeaveType {
  name: string;
  quota: number;
  status: string;
  isActive: boolean;
}

export interface Leave {
  id: number;
  employeeId: number;
  employeeName: string;
  employeePicture?: string;
  employeeRole?: string;
  leaveTypeId: number;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  days: number;
  dayType: string;
  reason?: string;
  status: string;
  approvedById?: number;
  approvedByName?: string;
  createdAt: string;
}
export interface CreateLeave {
  employeeId: number;
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  days: number;
  dayType: string;
  reason?: string;
  status: string;
  approvedById?: number;
}

export interface Holiday {
  id: number;
  title: string;
  fromDate: string;
  toDate: string;
  days: number;
  description?: string;
  status: string;
  isActive: boolean;
  createdAt: string;
}
export interface CreateHoliday {
  title: string;
  fromDate: string;
  toDate: string;
  days: number;
  description?: string;
  status: string;
  isActive: boolean;
}

export interface Payroll {
  id: number;
  employeeId: number;
  employeeName: string;
  employeePicture?: string;
  employeeRole?: string;
  employeeEmail?: string;
  basicSalary: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  bonus: number;
  otherAllowance: number;
  pf: number;
  professionalTax: number;
  tds: number;
  loanDeduction: number;
  otherDeduction: number;
  totalAllowance: number;
  totalDeduction: number;
  netSalary: number;
  status: string;
  month?: number;
  year?: number;
  createdAt: string;
}
export interface CreatePayroll {
  employeeId: number;
  basicSalary: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  bonus: number;
  otherAllowance: number;
  pf: number;
  professionalTax: number;
  tds: number;
  loanDeduction: number;
  otherDeduction: number;
  totalAllowance: number;
  totalDeduction: number;
  netSalary: number;
  status: string;
  month?: number;
  year?: number;
}

export interface Employee {
  id: number;
  employeeId?: string;
  fullName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  picture?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  departmentId?: number;
  departmentName?: string;
  designationId?: number;
  designationName?: string;
  shiftId?: number;
  shiftName?: string;
  dateOfJoining?: string;
  basicSalary?: number;
  status: string;
  isActive: boolean;
  createdAt: string;
}
export interface CreateEmployee {
  fullName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  departmentId?: number;
  designationId?: number;
  shiftId?: number;
  dateOfJoining?: string;
  basicSalary?: number;
  password?: string;
  status: string;
  isActive: boolean;
}

// ─── Departments ───
export const getDepartments = async (): Promise<Department[]> => { const { data } = await api.get('/departments'); return data; };
export const getDepartmentById = async (id: number): Promise<Department> => { const { data } = await api.get(`/departments/${id}`); return data; };
export const createDepartment = async (p: CreateDepartment): Promise<Department> => { const { data } = await api.post('/departments', p); return data; };
export const updateDepartment = async (id: number, p: CreateDepartment): Promise<Department> => { const { data } = await api.put(`/departments/${id}`, p); return data; };
export const deleteDepartment = async (id: number): Promise<void> => { await api.delete(`/departments/${id}`); };

// ─── Designations ───
export const getDesignations = async (): Promise<Designation[]> => { const { data } = await api.get('/designations'); return data; };
export const getDesignationById = async (id: number): Promise<Designation> => { const { data } = await api.get(`/designations/${id}`); return data; };
export const createDesignation = async (p: CreateDesignation): Promise<Designation> => { const { data } = await api.post('/designations', p); return data; };
export const updateDesignation = async (id: number, p: CreateDesignation): Promise<Designation> => { const { data } = await api.put(`/designations/${id}`, p); return data; };
export const deleteDesignation = async (id: number): Promise<void> => { await api.delete(`/designations/${id}`); };

// ─── Shifts ───
export const getShifts = async (): Promise<Shift[]> => { const { data } = await api.get('/shifts'); return data; };
export const getShiftById = async (id: number): Promise<Shift> => { const { data } = await api.get(`/shifts/${id}`); return data; };
export const createShift = async (p: CreateShift): Promise<Shift> => { const { data } = await api.post('/shifts', p); return data; };
export const updateShift = async (id: number, p: CreateShift): Promise<Shift> => { const { data } = await api.put(`/shifts/${id}`, p); return data; };
export const deleteShift = async (id: number): Promise<void> => { await api.delete(`/shifts/${id}`); };

// ─── Leave Types ───
export const getLeaveTypes = async (): Promise<LeaveType[]> => { const { data } = await api.get('/leavetypes'); return data; };
export const getLeaveTypeById = async (id: number): Promise<LeaveType> => { const { data } = await api.get(`/leavetypes/${id}`); return data; };
export const createLeaveType = async (p: CreateLeaveType): Promise<LeaveType> => { const { data } = await api.post('/leavetypes', p); return data; };
export const updateLeaveType = async (id: number, p: CreateLeaveType): Promise<LeaveType> => { const { data } = await api.put(`/leavetypes/${id}`, p); return data; };
export const deleteLeaveType = async (id: number): Promise<void> => { await api.delete(`/leavetypes/${id}`); };

// ─── Leaves ───
export const getLeaves = async (employeeId?: number): Promise<Leave[]> => { const q = employeeId ? `?employeeId=${employeeId}` : ''; const { data } = await api.get(`/leaves${q}`); return data; };
export const getLeaveById = async (id: number): Promise<Leave> => { const { data } = await api.get(`/leaves/${id}`); return data; };
export const createLeave = async (p: CreateLeave): Promise<Leave> => { const { data } = await api.post('/leaves', p); return data; };
export const updateLeave = async (id: number, p: CreateLeave): Promise<Leave> => { const { data } = await api.put(`/leaves/${id}`, p); return data; };
export const deleteLeave = async (id: number): Promise<void> => { await api.delete(`/leaves/${id}`); };

// ─── Holidays ───
export const getHolidays = async (): Promise<Holiday[]> => { const { data } = await api.get('/holidays'); return data; };
export const getHolidayById = async (id: number): Promise<Holiday> => { const { data } = await api.get(`/holidays/${id}`); return data; };
export const createHoliday = async (p: CreateHoliday): Promise<Holiday> => { const { data } = await api.post('/holidays', p); return data; };
export const updateHoliday = async (id: number, p: CreateHoliday): Promise<Holiday> => { const { data } = await api.put(`/holidays/${id}`, p); return data; };
export const deleteHoliday = async (id: number): Promise<void> => { await api.delete(`/holidays/${id}`); };

// ─── Payroll ───
export const getPayrolls = async (): Promise<Payroll[]> => { const { data } = await api.get('/payroll'); return data; };
export const getPayrollById = async (id: number): Promise<Payroll> => { const { data } = await api.get(`/payroll/${id}`); return data; };
export const createPayroll = async (p: CreatePayroll): Promise<Payroll> => { const { data } = await api.post('/payroll', p); return data; };
export const updatePayroll = async (id: number, p: CreatePayroll): Promise<Payroll> => { const { data } = await api.put(`/payroll/${id}`, p); return data; };
export const deletePayroll = async (id: number): Promise<void> => { await api.delete(`/payroll/${id}`); };

// ─── Employees ───
export const getEmployees = async (): Promise<Employee[]> => { const { data } = await api.get('/employees'); return data; };
export const getEmployeeById = async (id: number): Promise<Employee> => { const { data } = await api.get(`/employees/${id}`); return data; };
export const createEmployee = async (p: CreateEmployee): Promise<Employee> => { const { data } = await api.post('/employees', p); return data; };
export const updateEmployee = async (id: number, p: CreateEmployee): Promise<Employee> => { const { data } = await api.put(`/employees/${id}`, p); return data; };
export const deleteEmployee = async (id: number): Promise<void> => { await api.delete(`/employees/${id}`); };

// ─── Attendance ───
export interface Attendance {
  id: number; employeeId: number; employeeName: string; employeePicture?: string;
  designationName?: string; date: string; status: string;
  clockIn?: string; clockOut?: string; production?: string;
  breakTime?: string; overtime?: string; totalHours?: string; createdAt: string;
}
export interface CreateAttendance {
  employeeId: number; date: string; status: string;
  clockIn?: string; clockOut?: string; production?: string;
  breakTime?: string; overtime?: string; totalHours?: string;
}

export const getAttendances = async (date?: string, employeeId?: number): Promise<Attendance[]> => {
  const params: string[] = [];
  if (date) params.push(`date=${date}`);
  if (employeeId) params.push(`employeeId=${employeeId}`);
  const q = params.length ? `?${params.join('&')}` : '';
  const { data } = await api.get(`/attendance${q}`); return data;
};
export const getAttendanceById = async (id: number): Promise<Attendance> => { const { data } = await api.get(`/attendance/${id}`); return data; };
export const createAttendance = async (p: CreateAttendance): Promise<Attendance> => { const { data } = await api.post('/attendance', p); return data; };
export const updateAttendance = async (id: number, p: CreateAttendance): Promise<Attendance> => { const { data } = await api.put(`/attendance/${id}`, p); return data; };
export const deleteAttendance = async (id: number): Promise<void> => { await api.delete(`/attendance/${id}`); };
