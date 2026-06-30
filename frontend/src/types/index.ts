export type UserRole = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | 'LAB_TECH' | 'PHARMACIST' | 'HR'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export type AdmissionStatus = 'ADMITTED' | 'DISCHARGED' | 'TRANSFERRED'
export type RoomType = 'GENERAL' | 'PRIVATE' | 'ICU' | 'EMERGENCY' | 'OT' | 'MATERNITY'
export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
export type LabTestStatus = 'ORDERED' | 'COLLECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type BillStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED' | 'REFUNDED'
export type ClaimStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SETTLED'

export interface AuthUser {
  userId: number
  username: string
  email: string
  fullName: string
  role: UserRole
  accessToken: string
  refreshToken: string
  tokenType: string
}

export interface Department {
  id: number
  name: string
  description?: string
  createdAt: string
}

export interface Doctor {
  id: number
  name: string
  specialization?: string
  phone?: string
  email?: string
  licenseNumber?: string
  department?: Department
  createdAt: string
}

export interface Patient {
  id: number
  name: string
  dob?: string
  gender?: Gender
  phone?: string
  email?: string
  address?: string
  bloodGroup?: string
  createdAt: string
}

export interface Appointment {
  id: number
  patient: Patient
  doctor: Doctor
  appointmentDate: string
  status: AppointmentStatus
  reason?: string
  notes?: string
  createdAt: string
}

export interface Room {
  id: number
  roomNumber: string
  roomType: RoomType
  floor?: number
  status: RoomStatus
  dailyRate: number
}

export interface Admission {
  id: number
  patient: Patient
  doctor: Doctor
  room?: Room
  admissionDate: string
  dischargeDate?: string
  status: AdmissionStatus
  diagnosis?: string
}

export interface LabTest {
  id: number
  patient: Patient
  doctor?: Doctor
  testName: string
  orderedDate: string
  status: LabTestStatus
  notes?: string
}

export interface Bill {
  id: number
  patient: Patient
  totalAmount: number
  paidAmount: number
  discount: number
  status: BillStatus
  billDate: string
  dueDate?: string
}

export interface PharmacyItem {
  id: number
  name: string
  category?: string
  unitPrice: number
  stockQuantity: number
  reorderLevel: number
}

export interface Employee {
  id: number
  name: string
  role: string
  department?: Department
  phone?: string
  email?: string
  address?: string
  hireDate: string
}

export interface Payroll {
  id: number
  employee: Employee
  month: string
  basicSalary: number
  allowances: number
  deductions: number
  netSalary: number
  paid: boolean
  paidDate?: string
}

export interface DashboardStats {
  totalPatients: number
  todayAppointments: number
  currentAdmissions: number
  availableRooms: number
  pendingLabTests: number
  lowStockItems: number
  pendingBills: number
  monthlyRevenue: number
  totalDoctors: number
  totalEmployees: number
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}
