import type { Timestamp } from 'firebase/firestore'
import type {
  CapacityUnit,
  ExtinguisherAgent,
} from '../constants/sales'

export type SalesNoteLoanStatus =
  | 'active'
  | 'returned'

export type SalesNoteLoanReason =
  | 'recharge'
  | 'preventive_maintenance'
  | 'hydrostatic_test'
  | 'waiting_for_new_extinguisher'
  | 'other'

export type SalesNoteLoanSummary = {
  totalCount: number
  activeCount: number
}

export type SalesNoteLoan = {
  id: string

  equipmentCode: string
  normalizedEquipmentCode: string

  reason: SalesNoteLoanReason

  agent: ExtinguisherAgent
  capacityValue: number
  capacityUnit: CapacityUnit

  outgoingCondition: string

  status: SalesNoteLoanStatus

  loanedAt: Timestamp
  loanedBy: string

  returnedAt: Timestamp | null
  returnedBy: string | null
  returnNotes: string
}

export type LoanerCodeRegistryStatus =
  | 'available'
  | 'on_loan'

export type LoanerCodeRegistry = {
  equipmentCode: string
  status: LoanerCodeRegistryStatus

  currentNoteId: string | null
  currentLoanId: string | null

  updatedAt: Timestamp
  updatedBy: string
}

export type RegisterSalesNoteLoanInput = {
  equipmentCode: string
  reason: SalesNoteLoanReason
  agent: ExtinguisherAgent
  capacityValue: number
  capacityUnit: CapacityUnit
  outgoingCondition: string
}

export type RegisterSalesNoteLoanResult = {
  loanId: string
  loanSummary: SalesNoteLoanSummary
}

export type ReturnSalesNoteLoanResult = {
  loanSummary: SalesNoteLoanSummary
}