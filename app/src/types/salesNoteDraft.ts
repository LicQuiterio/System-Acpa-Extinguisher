import type {
  CapacityUnit,
  ExtinguisherAgent,
  ExtinguisherService,
} from '../constants/sales'

export type ExtinguisherServiceItemDraft = {
  id: string
  type: 'extinguisher_service'
  service: ExtinguisherService
  agent: ExtinguisherAgent
  capacityValue: number
  capacityUnit: CapacityUnit
  quantity: string
  unitPrice: string
  notes: string
}

export type GeneralProductItemDraft = {
  id: string
  type: 'general_product'
  description: string
  quantity: string
  unitPrice: string
  notes: string
}

export type SalesNoteItemDraft =
  | ExtinguisherServiceItemDraft
  | GeneralProductItemDraft