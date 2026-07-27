import { CAPACITIES } from '../constants/sales'
import type { SalesNoteItem } from '../types/salesNote'
import type {
  ExtinguisherServiceItemDraft,
  GeneralProductItemDraft,
  SalesNoteItemDraft,
} from '../types/salesNoteDraft'
import { parseMoneyToCents } from './money'
import {
  calculateLineSubtotal,
  calculateSubtotal,
} from './salesCalculations'

export function createExtinguisherItemDraft(
  id: string = crypto.randomUUID(),
): ExtinguisherServiceItemDraft {
  return {
    id,
    type: 'extinguisher_service',
    service: 'recharge',
    agent: 'pqs',
    capacityValue: CAPACITIES.kg[0],
    capacityUnit: 'kg',
    quantity: '1',
    unitPrice: '',
    notes: '',
  }
}

export function createGeneralProductItemDraft(
  id: string  = crypto.randomUUID(),
): GeneralProductItemDraft {
  return {
    id,
    type: 'general_product',
    description: '',
    quantity: '1',
    unitPrice: '',
    notes: '',
  }
}

function parseQuantity(value: string): number {
  const quantity = Number(value)

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(
      'La cantidad debe ser mayor que cero',
    )
  }

  return quantity
}

export function convertItemDraft(
  draft: SalesNoteItemDraft,
): SalesNoteItem {
  const quantity = parseQuantity(draft.quantity)
  const unitPriceCents =
    parseMoneyToCents(draft.unitPrice)

  const lineSubtotalCents =
    calculateLineSubtotal(
      quantity,
      unitPriceCents,
    )

  if (draft.type === 'extinguisher_service') {
    if (draft.capacityValue <= 0) {
      throw new Error(
        'Selecciona una capacidad válida',
      )
    }

    return {
      id: draft.id,
      type: draft.type,
      service: draft.service,
      agent: draft.agent,
      capacityValue: draft.capacityValue,
      capacityUnit: draft.capacityUnit,
      quantity,
      unitPriceCents,
      lineSubtotalCents,
      notes: draft.notes.trim(),
    }
  }

  const description = draft.description.trim()

  if (!description) {
    throw new Error(
      'La descripción del producto es obligatoria',
    )
  }

  return {
    id: draft.id,
    type: draft.type,
    description,
    quantity,
    unitPriceCents,
    lineSubtotalCents,
    notes: draft.notes.trim(),
  }
}

export function convertItemDrafts(
  drafts: readonly SalesNoteItemDraft[],
): SalesNoteItem[] {
  if (drafts.length === 0) {
    throw new Error(
      'Agrega al menos un concepto',
    )
  }

  return drafts.map(convertItemDraft)
}

export function calculateDraftSubtotal(
  drafts: readonly SalesNoteItemDraft[],
): number {
  return calculateSubtotal(
    convertItemDrafts(drafts),
  )
}