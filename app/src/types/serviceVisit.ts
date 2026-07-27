import type { Timestamp } from 'firebase/firestore'

export const SERVICE_VISIT_STATUSES = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
] as const

export type ServiceVisitStatus =
  (typeof SERVICE_VISIT_STATUSES)[number]

export const SERVICE_VISIT_STATUS_LABELS: Record<
  ServiceVisitStatus,
  string
> = {
  scheduled: 'Programada',
  in_progress: 'En proceso',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

export type ServiceVisit = {
  id: string
  clientId: string
  locationId: string
  scheduledDate: Timestamp
  completedDate: Timestamp | null
  technicianId: string
  technicianName: string
  status: ServiceVisitStatus
  notes: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy: string
}

export type ServiceVisitInput = {
  clientId: string
  locationId: string
  scheduledDate: string
  completedDate: string
  technicianId: string
  technicianName: string
  status: ServiceVisitStatus
  notes: string
}