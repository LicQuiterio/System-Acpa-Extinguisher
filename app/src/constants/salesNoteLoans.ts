import type {
  SalesNoteLoanReason,
  SalesNoteLoanSummary,
} from '../types/salesNoteLoan'

export const SALES_NOTE_LOAN_REASONS = [
  {
    value: 'recharge',
    label: 'Préstamo por recarga',
  },
  {
    value: 'preventive_maintenance',
    label: 'Préstamo por mantenimiento preventivo',
  },
  {
    value: 'hydrostatic_test',
    label: 'Préstamo por prueba hidrostática',
  },
    {
    value: 'waiting_for_new_extinguisher',
    label: 'Préstamo en espera de extintor nuevo',
  },
  {
    value: 'other',
    label: 'Otro motivo',
  },
] as const satisfies readonly {
  value: SalesNoteLoanReason
  label: string
}[]

export const EMPTY_SALES_NOTE_LOAN_SUMMARY:
  SalesNoteLoanSummary = {
    totalCount: 0,
    activeCount: 0,
  }

export const MAX_EQUIPMENT_CODE_LENGTH = 40
export const MAX_LOAN_CONDITION_LENGTH = 500
export const MAX_LOAN_RETURN_NOTES_LENGTH = 500