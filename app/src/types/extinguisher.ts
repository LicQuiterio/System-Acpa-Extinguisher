import type { Timestamp } from 'firebase/firestore'

export const EXTINGUISHER_TYPES = [
  'dry_chemical',
  'co2',
  'water',
  'foam',
  'wet_chemical',
  'clean_agent',
  'other',
] as const

export type ExtinguisherType =
  (typeof EXTINGUISHER_TYPES)[number]

export const EXTINGUISHER_TYPE_LABELS:
  Record<ExtinguisherType, string> = {
    dry_chemical: 'Polvo químico seco',
    co2: 'Dióxido de carbono',
    water: 'Agua',
    foam: 'Espuma',
    wet_chemical: 'Químico húmedo',
    clean_agent: 'Agente limpio',
    other: 'Otro',
  }

export const CAPACITY_UNITS = ['kg', 'lb', 'L'] as const

export type CapacityUnit = (typeof CAPACITY_UNITS)[number]

export const EXTINGUISHER_CONDITIONS = [
  'operational',
  'service_due',
  'out_of_service',
  'retired',
] as const

export type ExtinguisherCondition =
  (typeof EXTINGUISHER_CONDITIONS)[number]

export const EXTINGUISHER_CONDITION_LABELS:
  Record<ExtinguisherCondition, string> = {
    operational: 'Operativo',
    service_due: 'Servicio requerido',
    out_of_service: 'Fuera de servicio',
    retired: 'Retirado',
  }

export type Extinguisher = {
  id: string
  clientId: string
  locationId: string
  serialNumber: string
  type: ExtinguisherType
  capacityValue: number
  capacityUnit: CapacityUnit
  brand: string
  model: string
  condition: ExtinguisherCondition
  lastServiceDate: Timestamp | null
  nextServiceDate: Timestamp | null
  notes: string
  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy: string
}

export type ExtinguisherInput = {
  clientId: string
  locationId: string
  serialNumber: string
  type: ExtinguisherType
  capacityValue: number
  capacityUnit: CapacityUnit
  brand: string
  model: string
  condition: ExtinguisherCondition
  lastServiceDate: string
  nextServiceDate: string
  notes: string
  active: boolean
}