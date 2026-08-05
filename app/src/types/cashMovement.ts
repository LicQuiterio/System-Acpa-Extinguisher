import type { Timestamp } from 'firebase/firestore'
import type { PaymentMethod } from './salesNote'

export type CashMovementType =
  | 'income'
  | 'expense'
  | 'owner_withdrawal'

export type CashMovementSource =
  | 'sales_payment'
  | 'manual'

export type CashMovement = {
  id: string
  businessDate: string
  type: CashMovementType
  source: CashMovementSource
  amountCents: number
  paymentMethod: PaymentMethod
  concept: string
  quantity: number
  observations: string
  noteId: string | null
  folioDisplay: string | null
  paymentId: string | null
  occurredAt: Timestamp
  createdAt: Timestamp
  createdBy: string
}

export type CashFund = {
  initialBalanceCents: number
  initializedOn: string
  initializedAt: Timestamp
  initializedBy: string
}

export type CashClosing = {
  businessDate: string
  status: 'closing' | 'closed'
  openingBalanceCents: number | null
  cashIncomeCents: number | null
  electronicIncomeCents: number | null
  expenseCents: number | null
  withdrawalCents: number | null
  closingBalanceCents: number | null
  movementCount: number | null
  startedAt: Timestamp
  startedBy: string
  closedAt: Timestamp | null
  closedBy: string | null
}

export type RegisterCashOutflowInput = {
  type: 'expense' | 'owner_withdrawal'
  amountCents: number
  concept: string
  quantity: number
  observations: string
}

export type CashDailySummary = {
  openingBalanceCents: number
  cashIncomeCents: number
  electronicIncomeCents: number
  expenseCents: number
  withdrawalCents: number
  totalOutflowCents: number
  estimatedCashCents: number
}

export type CashDayState = {
  fund: CashFund | null
  movements: CashMovement[]
  summary: CashDailySummary
  closing: CashClosing | null
}
