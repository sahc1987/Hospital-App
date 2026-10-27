export type UserRole = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | 'LAB_TECH' | 'PHARMACIST' | 'HR'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export type AdmissionStatus = 'ADMITTED' | 'DISCHARGED' | 'TRANSFERRED'
export type RoomType = 'GENERAL' | 'PRIVATE' | 'ICU' | 'EMERGENCY' | 'OT' | 'MATERNITY'
export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
export type LabTestStatus = 'ORDERED' | 'COLLECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type BillStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED' | 'REFUNDED'

export interface AuthUser {
  userId: number
  username: string
  email: string
  fullName: string
  role: UserRole
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
  workStart: string     // "09:00:00" (hospital local time)
  workEnd: string
  slotMinutes: number
  workDays: string      // "MON,TUE,WED,THU,FRI"
  consultationFee: number  // auto-billed on completion; 0 = no bill
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
  allergies?: string
  conditions?: string
  createdAt: string
}

export interface Appointment {
  id: number
  patient: Patient
  doctor: Doctor
  appointmentDate: string   // naive hospital-local ISO, e.g. "2026-10-28T09:30:00"
  endDate: string
  durationMinutes: number
  status: AppointmentStatus
  reason?: string
  notes?: string
  cancelReason?: string
  checkedInAt?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}

export interface RxItem {
  medication: string
  dosage?: string
  frequency?: string
  duration?: string
  instructions?: string
}

/** Clinical record of a visit (GET /appointments/{id}/visit) — clinical roles only. */
export interface Visit {
  diagnosis: string | null
  visitNote: string | null
  prescription: RxItem[]
  addenda: AppointmentHistoryEntry[]
  labTests: { id: number; test_name: string; status: LabTestStatus }[]
}

export interface PastVisit {
  id: number
  appointment_date: string
  diagnosis: string | null
  visit_note: string | null
  doctor: string
}

export interface AppointmentHistoryEntry {
  action: 'CREATED' | 'STATUS' | 'RESCHEDULED' | 'EDITED' | 'ADDENDUM'
  from_status: AppointmentStatus | null
  to_status: AppointmentStatus | null
  note: string | null
  changed_by: string
  changed_at: string
}

export interface Room {
  id: number
  roomNumber: string
  roomType: RoomType
  floor?: number
  status: RoomStatus
  dailyRate: number
  capacity: number  // beds; 1 = single-patient room
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
  appointmentId?: number
  billId?: number
}

export interface AdmissionEvent {
  id: number
  type: 'ADMITTED' | 'TRANSFER' | 'DISCHARGED' | 'NOTE' | 'ADDENDUM'
  note: string | null
  author: string
  created_at: string
  from_room: string | null
  to_room: string | null
}

export interface VitalsRow {
  id: number
  recorded_at: string
  temp_c: number | null
  systolic: number | null
  diastolic: number | null
  pulse: number | null
  resp_rate: number | null
  spo2: number | null
  pain: number | null
  author: string
}

export interface MedOrder {
  id: number
  medication: string
  dosage: string | null
  route: string | null
  frequency: string | null
  instructions: string | null
  ordered_by: string
  ordered_at: string
  stopped_by: string | null
  stopped_at: string | null
  administrations: { status: 'GIVEN' | 'HELD' | 'REFUSED'; note: string | null; given_by: string; given_at: string }[]
}

/** GET /admissions/{id}/record — clinical fields only present for ADMIN/DOCTOR/NURSE. */
export interface StayRecord {
  events: AdmissionEvent[]
  losDays: number
  accruedCost: number
  finalDiagnosis?: string | null
  dischargeSummary?: string | null
  dischargeInstructions?: string | null
  vitals?: VitalsRow[]
  medications?: MedOrder[]
}

export interface BoardRoom {
  room: Room
  occupants: { admission_id: number; patient_id: number; patient: string; doctor: string; admission_date: string; alerts: boolean }[]
}

export interface LabTest {
  id: number
  patient: Patient
  doctor?: Doctor
  testName: string
  orderedDate: string
  status: LabTestStatus
  notes?: string
  appointmentId?: number
  result?: { resultData?: string; remarks?: string; resultDate?: string } | null
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
  occupiedRooms: number
  totalRooms: number   // available + occupied + maintenance
  pendingLabTests: number
  lowStockItems: number
  pendingBills: number
  monthlyRevenue: number
  totalDoctors: number
  totalEmployees: number
}

/** Daily counts for the last 7 days, oldest first; arrays align with `days` (ISO dates). */
export interface DashboardTrends {
  days: string[]
  admissions: number[]
  appointments: number[]
  labTests: number[]
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

export interface LinkedStaff {
  type: 'DOCTOR' | 'EMPLOYEE'
  id: number
  name: string
}

export interface SystemUser {
  id: number
  username: string
  email: string
  fullName: string
  role: UserRole
  active: boolean
  createdAt: string
  updatedAt: string
  linkedStaff: LinkedStaff | null
}
