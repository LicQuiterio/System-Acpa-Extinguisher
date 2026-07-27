import type { Timestamp } from 'firebase/firestore'
import type { Municipality } from '../constants/serviceAreas'
import type {
  CapacityUnit,
  ExtinguisherAgent,
  ExtinguisherService,
} from '../constants/sales'

export type FolioMode = 'automatic' | 'manual'

export type DocumentStatus = 'issued' | 'cancelled'

export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

export type SalesNoteDelivery =
  | {
      status: 'pending'
      scheduledDate: string
      deliveredAt: null
      deliveredBy: null
    }
  | {
      status: 'delivered'
      scheduledDate: string | null
      deliveredAt: Timestamp
      deliveredBy: string
    }

export type SalesNoteDeliveryInput =
  | {
      status: 'pending'
      scheduledDate: string
    }
  | {
      status: 'delivered'
      scheduledDate: string | null
    }

export type SalesNoteHistoryDelivery = {
  status: 'pending' | 'delivered'
  scheduledDate: string | null
  deliveredAt: Timestamp | null
  deliveredBy: string | null
  isLegacy: boolean
}

export type SalesNoteHistoryItem = {
  id: string

  folioNumber: number
  folioDisplay: string
  issuedAt: Timestamp

  clientId: string
  customerSnapshot: CustomerSnapshot

  amounts: SalesNoteAmounts

  documentStatus: DocumentStatus
  paymentStatus: PaymentStatus
  delivery: SalesNoteHistoryDelivery
}

export type PaymentMethod = 'cash' | 'transfer' | 'card'

export type ExtinguisherServiceItem = {
  id: string
  type: 'extinguisher_service'
  service: ExtinguisherService
  agent: ExtinguisherAgent
  capacityValue: number
  capacityUnit: CapacityUnit
  quantity: number
  unitPriceCents: number
  lineSubtotalCents: number
  notes: string
}

export type GeneralProductItem = {
  id: string
  type: 'general_product'
  description: string
  quantity: number
  unitPriceCents: number
  lineSubtotalCents: number
  notes: string
}

export type SalesNoteItem =
  | ExtinguisherServiceItem
  | GeneralProductItem

export type CustomerSnapshot = {
  type: 'company' | 'individual'
  companyName: string
  contactName: string
  phone: string
  email: string
  address: string
  serviceAreaId: string
  municipality: Municipality
  locality: string
  serviceAreaDisplayName: string
}

export type SalesNoteAmounts = {
  subtotalCents: number

  applyVat: boolean
  vatRateBasisPoints: number
  vatAmountCents: number

  applyResicoWithholding: boolean
  resicoRateBasisPoints: number
  resicoAmountCents: number

  totalCents: number
  paidCents: number
  balanceCents: number
}

export type SalesNoteTerms = {
  deliveryTime: string
  warranty: string
  clauses: string[]
  additionalCondition: string
}

export type SalesNoteCancellation = {
  reason: string
  cancelledAt: Timestamp
  cancelledBy: string
}

export type SalesNote = {
  id: string

  folioNumber: number
  folioDisplay: string
  folioMode: FolioMode
  manualFolioReason: string | null

  issuedAt: Timestamp

  clientId: string
  customerSnapshot: CustomerSnapshot

  items: SalesNoteItem[]
  amounts: SalesNoteAmounts
  terms: SalesNoteTerms

  documentStatus: DocumentStatus
  paymentStatus: PaymentStatus
  delivery: SalesNoteDelivery

  notes: string
  cancellation: SalesNoteCancellation | null

  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy: string
  lastPaymentId: string | null
}

export type Payment = {
  id: string
  amountCents: number
  method: PaymentMethod
  paidAt: Timestamp
  createdAt: Timestamp
  createdBy: string
  active: boolean
}

export type SalesNoteDetail = Omit<
  SalesNote,
  'delivery'
> & {
  delivery: SalesNoteHistoryDelivery
  payments: Payment[]
}

export type PaymentInput = {
  amountCents: number
  method: PaymentMethod
}

export type RegisterSalesNotePaymentResult = {
  paymentId: string
  paidCents: number
  balanceCents: number
  paymentStatus: PaymentStatus
}

export type CreateSalesNoteInput = {
  clientId: string
  items: SalesNoteItem[]

  applyVat: boolean
  applyResicoWithholding: boolean

  payments: PaymentInput[]
  terms: SalesNoteTerms
  delivery: SalesNoteDeliveryInput
  notes: string
}

export type CreateSalesNoteResult = {
  noteId: string
  folioNumber: number
  folioDisplay: string
}