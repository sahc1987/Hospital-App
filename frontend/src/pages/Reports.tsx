import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/endpoints'
import { StatCard } from '@/components/ui/StatCard'
import { Users, DollarSign, Stethoscope, UserCog } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'

const COLORS = ['#F45D22', '#1C1C1C', '#22C55E', '#3B82F6', '#F59E0B']

const deptData = [
  { name: 'Cardiology',   patients: 120 },
  { name: 'Neurology',    patients: 85 },
  { name: 'Orthopedics',  patients: 95 },
  { name: 'Pediatrics',   patients: 70 },
  { name: 'Emergency',    patients: 200 },
  { name: 'Oncology',     patients: 55 },
]

const admissionTrend = [
  { month: 'Jan', admissions: 45, discharges: 42 },
  { month: 'Feb', admissions: 52, discharges: 50 },
  { month: 'Mar', admissions: 48, discharges: 45 },
  { month: 'Apr', admissions: 60, discharges: 58 },
  { month: 'May', admissions: 55, discharges: 52 },
  { month: 'Jun', admissions: 70, discharges: 68 },
]

const billStatusData = [
  { name: 'Paid',     value: 45 },
  { name: 'Pending',  value: 30 },
  { name: 'Partial',  value: 15 },
  { name: 'Overdue',  value: 10 },
]

export default function Reports() {
  const { data: statsRes } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats(),
  })
  const stats = statsRes?.data?.data

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard dark  title="Total Patients"    value={stats?.totalPatients ?? '—'}     icon={<Users size={18} className="text-white" />} />
        <StatCard       title="Total Doctors"     value={stats?.totalDoctors ?? '—'}      icon={<Stethoscope size={18} />} accent />
        <StatCard dark  title="Monthly Revenue"   value={`$${((stats?.monthlyRevenue ?? 0)/1000).toFixed(1)}k`} icon={<DollarSign size={18} className="text-white" />} />
        <StatCard       title="Total Employees"   value={stats?.totalEmployees ?? '—'}    icon={<UserCog size={18} />} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Patients by department */}
        <div className="card">
          <h3 className="font-semibold text-ink mb-1">Patients by Department</h3>
          <p className="text-xs text-ink-muted mb-5">Current period distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717A' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ border: 'none', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
              <Bar dataKey="patients" fill="#F45D22" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bill status pie */}
        <div className="card">
          <h3 className="font-semibold text-ink mb-1">Billing Status</h3>
          <p className="text-xs text-ink-muted mb-5">Payment distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={billStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                paddingAngle={3} dataKey="value">
                {billStatusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ border: 'none', borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="card">
        <h3 className="font-semibold text-ink mb-1">Admission Trend</h3>
        <p className="text-xs text-ink-muted mb-5">Monthly admissions vs discharges</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={admissionTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ border: 'none', borderRadius: 12, fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="admissions" stroke="#F45D22" strokeWidth={2.5}
              dot={{ r: 4, fill: '#F45D22' }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="discharges" stroke="#1C1C1C" strokeWidth={2}
              dot={{ r: 3, fill: '#1C1C1C' }} strokeDasharray="5 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
