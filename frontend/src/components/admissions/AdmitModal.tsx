import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { admissionApi, doctorApi, patientApi, roomApi } from '@/api/endpoints'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

export interface AdmitPreset {
  patientId?: number
  doctorId?: number
  roomId?: number
  diagnosis?: string
  appointmentId?: number   // admitting from a consultation
}

/** Admit a patient. Rooms list only those with a free bed; the API re-checks (and the DB enforces) capacity. */
export function AdmitModal({ preset, onClose, onAdmitted }: {
  readonly preset: AdmitPreset
  readonly onClose: () => void
  readonly onAdmitted?: (admissionId: number) => void
}) {
  const qc = useQueryClient()
  const [patientId, setPatientId] = useState(preset.patientId ? String(preset.patientId) : '')
  const [doctorId, setDoctorId] = useState(preset.doctorId ? String(preset.doctorId) : '')
  const [roomId, setRoomId] = useState(preset.roomId ? String(preset.roomId) : '')
  const [diagnosis, setDiagnosis] = useState(preset.diagnosis ?? '')

  // ponytail: first 100 patients/doctors — switch to search boxes past that
  const { data: patients = [] } = useQuery({ queryKey: ['patients-list'], queryFn: async () => (await patientApi.list(undefined, 0, 100)).data.data.content })
  const { data: doctors = [] } = useQuery({ queryKey: ['doctors-list'], queryFn: async () => (await doctorApi.list(undefined, 0, 100)).data.data.content })
  const { data: board = [] } = useQuery({ queryKey: ['rooms', 'board'], queryFn: async () => (await roomApi.board()).data.data })
  const free = board.filter((b) => b.room.status !== 'MAINTENANCE' && b.occupants.length < b.room.capacity)

  const admit = useMutation({
    mutationFn: () => admissionApi.create({
      patientId: Number(patientId), doctorId: Number(doctorId), roomId: roomId ? Number(roomId) : undefined,
      diagnosis: diagnosis || undefined, appointmentId: preset.appointmentId,
    }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['admissions'] })
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Patient admitted')
      onAdmitted?.(r.data.data.id)
      onClose()
    },
    onError: () => qc.invalidateQueries({ queryKey: ['rooms', 'board'] }), // a bed may have just been taken
  })

  return (
    <Modal open onClose={onClose} title={preset.appointmentId ? 'Admit from consultation' : 'Admit patient'} size="lg">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); admit.mutate() }}>
        <Select label="Patient" required value={patientId} disabled={!!preset.patientId}
          onChange={(e) => setPatientId(e.target.value)} options={patients.map((p) => ({ value: p.id, label: p.name }))} />
        <Select label="Attending doctor" required value={doctorId} onChange={(e) => setDoctorId(e.target.value)}
          options={doctors.map((d) => ({ value: d.id, label: d.specialization ? d.name + ' — ' + d.specialization : d.name }))} />
        <Select label="Room (free beds only)" value={roomId} onChange={(e) => setRoomId(e.target.value)}
          options={free.map((b) => ({
            value: b.room.id,
            label: `${b.room.roomNumber} · ${b.room.roomType.toLowerCase()} · floor ${b.room.floor ?? '—'} · `
              + `${b.room.capacity - b.occupants.length}/${b.room.capacity} free · $${b.room.dailyRate}/night`,
          }))} />
        {!roomId && <p className="-mt-2 text-xs text-ink-muted">No room = admitted pending a bed (e.g. in emergency).</p>}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="adm-dx" className="text-sm font-medium text-ink">Admitting diagnosis</label>
          <input id="adm-dx" className="input" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          <Button type="submit" disabled={!patientId || !doctorId} loading={admit.isPending}>Admit</Button>
        </div>
      </form>
    </Modal>
  )
}
