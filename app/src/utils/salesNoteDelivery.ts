import type {
  SalesNoteDeliveryInput,
  SalesNoteHistoryDelivery,
} from '../types/salesNote'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isValidScheduledDate(
  value: string,
): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false
  }

  const [year, month, day] = value
    .split('-')
    .map(Number)

  const date = new Date(
    Date.UTC(year, month - 1, day),
  )

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function normalizeDeliveryInput(
  delivery: SalesNoteDeliveryInput,
): SalesNoteDeliveryInput {
  if (delivery.status === 'pending') {
    const scheduledDate =
      delivery.scheduledDate.trim()

    if (!isValidScheduledDate(scheduledDate)) {
      throw new Error(
        'Indica una fecha programada de entrega válida',
      )
    }

    return {
      status: 'pending',
      scheduledDate,
    }
  }

  const scheduledDate =
    delivery.scheduledDate?.trim() || null

  if (
    scheduledDate !== null &&
    !isValidScheduledDate(scheduledDate)
  ) {
    throw new Error(
      'La fecha programada de entrega no es válida',
    )
  }

  return {
    status: 'delivered',
    scheduledDate,
  }
}
export function prepareDeliveryCompletion(
  delivery: SalesNoteHistoryDelivery,
): SalesNoteDeliveryInput {
  if (delivery.status === 'delivered') {
    throw new Error(
      'La nota ya fue marcada como entregada',
    )
  }

  return {
    status: 'delivered',
    scheduledDate: delivery.scheduledDate,
  }
}