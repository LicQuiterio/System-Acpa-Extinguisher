export const EXTINGUISHER_SERVICES = [
{ value: 'recharge', label: 'Recarga' },
  {
    value: 'preventive_maintenance',
    label: 'Mantenimiento preventivo',
  },
  {
    value: 'hydrostatic_test',
    label: 'Prueba hidrostática',
  },
  {
    value: 'new_extinguisher_sale',
    label: 'Venta de extintor nuevo',
  },
]as const
export type ExtinguisherService =
  (typeof EXTINGUISHER_SERVICES)[number]['value']

export const EXTINGUISHER_AGENTS = [
  { value: 'co2', label: 'CO₂' },
  { value: 'pqs', label: 'PQS' },
  {
    value: 'pressurized_water',
    label: 'Agua a presión',
  },
  { value: 'afff', label: 'AFFF' },
  {
    value: 'clean_agent',
    label: 'Agente limpio',
  },
] as const

export type ExtinguisherAgent =
  (typeof EXTINGUISHER_AGENTS)[number]['value']

export const CAPACITY_UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 'l', label: 'L' },
  { value: 'lb', label: 'lb' },
] as const

export type CapacityUnit =
  (typeof CAPACITY_UNITS)[number]['value']

export const CAPACITIES = {
  kg: [0.75, 1, 2, 2.3, 4.5, 6, 6.8, 9, 12, 35, 50, 70],
  l: [9, 9.46, 9.5, 10],
  lb: [5, 10, 15, 20],
} as const satisfies Record<CapacityUnit, readonly number[]>

export const GENERAL_PRODUCT_SUGGESTIONS = [
  'Señalética',
  'Gabinete',
  'Soporte',
  'Casco',
  'Guantes',
  'Chaleco reflectante',
  'Manguera',
  'Manómetro',
  'Vástago',
  'Válvula',
  'Gancho',
] as const