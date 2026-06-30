import client from './client'
import type {
  ApiResponse, PageResponse,
  Patient, Doctor, Department, Appointment, Room, Admission,
  LabTest, Bill, PharmacyItem, Employee, Payroll, DashboardStats, AuthUser
} from '@/types'

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    client.post<ApiResponse<AuthUser>>('/auth/login', { username, password }),
  refresh: (token: string) =>
    client.post<ApiResponse<AuthUser>>(`/auth/refresh?token=${token}`),
}

// Dashboard
export const dashboardApi = {
  stats: () => client.get<ApiResponse<DashboardStats>>('/dashboard/stats'),
}

// Patients
export const patientApi = {
  list: (q?: string, page = 0, size = 20) =>
    client.get<ApiResponse<PageResponse<Patient>>>('/patients', { params: { q, page, size } }),
  get: (id: number) => client.get<ApiResponse<Patient>>(`/patients/${id}`),
  create: (data: Partial<Patient>) => client.post<ApiResponse<Patient>>('/patients', data),
  update: (id: number, data: Partial<Patient>) => client.put<ApiResponse<Patient>>(`/patients/${id}`, data),
  delete: (id: number) => client.delete(`/patients/${id}`),
}

// Doctors
export const doctorApi = {
  list: (name?: string, page = 0, size = 20) =>
    client.get<ApiResponse<PageResponse<Doctor>>>('/doctors', { params: { name, page, size } }),
  get: (id: number) => client.get<ApiResponse<Doctor>>(`/doctors/${id}`),
  byDepartment: (deptId: number) => client.get<ApiResponse<Doctor[]>>(`/doctors/department/${deptId}`),
  create: (data: Partial<Doctor>, departmentId?: number) =>
    client.post<ApiResponse<Doctor>>('/doctors', { ...data, departmentId }),
  update: (id: number, data: Partial<Doctor>, departmentId?: number) =>
    client.put<ApiResponse<Doctor>>(`/doctors/${id}`, { ...data, departmentId }),
  delete: (id: number) => client.delete(`/doctors/${id}`),
}

// Departments
export const departmentApi = {
  list: () => client.get<ApiResponse<Department[]>>('/departments'),
  create: (data: Partial<Department>) => client.post<ApiResponse<Department>>('/departments', data),
  update: (id: number, data: Partial<Department>) =>
    client.put<ApiResponse<Department>>(`/departments/${id}`, data),
  delete: (id: number) => client.delete(`/departments/${id}`),
}

// Appointments
export const appointmentApi = {
  list: (page = 0, size = 20) =>
    client.get<ApiResponse<PageResponse<Appointment>>>('/appointments', { params: { page, size } }),
  today: () => client.get<ApiResponse<Appointment[]>>('/appointments/today'),
  get: (id: number) => client.get<ApiResponse<Appointment>>(`/appointments/${id}`),
  byPatient: (patientId: number) =>
    client.get<ApiResponse<PageResponse<Appointment>>>(`/appointments/patient/${patientId}`),
  create: (patientId: number, doctorId: number, date: string, reason?: string) =>
    client.post<ApiResponse<Appointment>>('/appointments', {
      patientId, doctorId, appointmentDate: date, reason,
    }),
  updateStatus: (id: number, status: string, notes?: string) =>
    client.patch(`/appointments/${id}/status`, null, { params: { status, notes } }),
  delete: (id: number) => client.delete(`/appointments/${id}`),
}

// Rooms
export const roomApi = {
  list: () => client.get<ApiResponse<Room[]>>('/rooms'),
  available: () => client.get<ApiResponse<Room[]>>('/rooms/available'),
  create: (data: Partial<Room>) => client.post<ApiResponse<Room>>('/rooms', data),
  update: (id: number, data: Partial<Room>) => client.put<ApiResponse<Room>>(`/rooms/${id}`, data),
  updateStatus: (id: number, status: string) =>
    client.patch(`/rooms/${id}/status`, null, { params: { status } }),
}

// Admissions
export const admissionApi = {
  list: (page = 0, size = 20) =>
    client.get<ApiResponse<PageResponse<Admission>>>('/admissions', { params: { page, size } }),
  get: (id: number) => client.get<ApiResponse<Admission>>(`/admissions/${id}`),
  create: (data: Partial<Admission & { patientId: number; doctorId: number; roomId?: number }>) =>
    client.post<ApiResponse<Admission>>('/admissions', data),
  discharge: (id: number) => client.patch(`/admissions/${id}/discharge`),
}

// Lab
export const labApi = {
  list: (page = 0, size = 20) =>
    client.get<ApiResponse<PageResponse<LabTest>>>('/lab', { params: { page, size } }),
  get: (id: number) => client.get<ApiResponse<LabTest>>(`/lab/${id}`),
  create: (data: Partial<LabTest & { patientId: number; doctorId?: number }>) =>
    client.post<ApiResponse<LabTest>>('/lab', data),
  updateStatus: (id: number, status: string) =>
    client.patch(`/lab/${id}/status`, null, { params: { status } }),
  submitResult: (testId: number, data: { resultData: string; remarks?: string }) =>
    client.post(`/lab/${testId}/result`, data),
}

// Billing
export const billingApi = {
  list: (page = 0, size = 20) =>
    client.get<ApiResponse<PageResponse<Bill>>>('/bills', { params: { page, size } }),
  get: (id: number) => client.get<ApiResponse<Bill>>(`/bills/${id}`),
  byPatient: (patientId: number) =>
    client.get<ApiResponse<PageResponse<Bill>>>(`/bills/patient/${patientId}`),
  create: (data: Partial<Bill & { patientId: number }>) =>
    client.post<ApiResponse<Bill>>('/bills', data),
  recordPayment: (id: number, amount: number) =>
    client.patch(`/bills/${id}/pay`, null, { params: { amount } }),
}

// Pharmacy
export const pharmacyApi = {
  list: (name?: string, page = 0) =>
    client.get<ApiResponse<PageResponse<PharmacyItem>>>('/pharmacy', { params: { name, page } }),
  lowStock: () => client.get<ApiResponse<PharmacyItem[]>>('/pharmacy/low-stock'),
  create: (data: Partial<PharmacyItem>) => client.post<ApiResponse<PharmacyItem>>('/pharmacy', data),
  update: (id: number, data: Partial<PharmacyItem>) =>
    client.put<ApiResponse<PharmacyItem>>(`/pharmacy/${id}`, data),
  restock: (id: number, quantity: number) =>
    client.patch(`/pharmacy/${id}/restock`, null, { params: { quantity } }),
}

// Employees
export const employeeApi = {
  list: (name?: string, page = 0) =>
    client.get<ApiResponse<PageResponse<Employee>>>('/employees', { params: { name, page } }),
  get: (id: number) => client.get<ApiResponse<Employee>>(`/employees/${id}`),
  create: (data: Partial<Employee & { departmentId?: number }>) =>
    client.post<ApiResponse<Employee>>('/employees', data),
  update: (id: number, data: Partial<Employee>) =>
    client.put<ApiResponse<Employee>>(`/employees/${id}`, data),
}

// Payroll
export const payrollApi = {
  list: (page = 0) => client.get<ApiResponse<PageResponse<Payroll>>>('/payroll', { params: { page } }),
  byEmployee: (empId: number) =>
    client.get<ApiResponse<PageResponse<Payroll>>>(`/payroll/employee/${empId}`),
  generate: (employeeId: number, month: string, basicSalary: number) =>
    client.post<ApiResponse<Payroll>>('/payroll', null, { params: { employeeId, month, basicSalary } }),
  markPaid: (id: number) => client.patch(`/payroll/${id}/pay`),
}
