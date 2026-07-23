import type { Timestamp } from 'firebase/firestore'

export const MAINTENANCE_RESULTS = [
  'completed',
  'requires_recharge',
  'requires_repair',
  'replacement_recommended',
  'not_completed',
] as const

export type MaintenanceResult =
  (typeof MAINTENANCE_RESULTS)[number]

export const MAINTENANCE_RESULT_LABELS: Record<
  MaintenanceResult,
  string
> = {
  completed: 'Completado',
  requires_recharge: 'Requiere recarga',
  requires_repair: 'Requiere reparación',
  replacement_recommended: 'Se recomienda reemplazo',
  not_completed: 'No completado',
}

export type Maintenance = {
  id: string
  clientId: string
  locationId: string
  extinguisherId: string
  visitDate: Timestamp
  technicianId: string
  technicianName: string
  result: MaintenanceResult
  notes: string
  nextServiceDate: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy: string
}

export type MaintenanceInput = {
  clientId: string
  locationId: string
  extinguisherId: string
  visitDate: string
  technicianId: string
  technicianName: string
  result: MaintenanceResult
  notes: string
  nextServiceDate: string
}