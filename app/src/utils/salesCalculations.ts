import type {
  PaymentInput,
  PaymentStatus,
  SalesNoteItem,
} from '../types/salesNote'

export const VAT_RATE_BASIS_POINTS = 1600
export const RESICO_RATE_BASIS_POINTS = 125

const BASIS_POINTS_DIVISOR = 10_000

export type TotalInput = {
  subtotalCents: number
  vatAmountCents: number
  resicoAmountCents: number
}

export type PaymentSummary = {
  paidCents: number
  balanceCents: number
  paymentStatus: PaymentStatus
}

function assertNonNegativeCents(
  value: number,
  fieldName: string,
): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      `${fieldName} debe ser un entero no negativo en centavos`,
    )
  }
}

function assertPositiveCents(
  value: number,
  fieldName: string,
): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(
      `${fieldName} debe ser mayor que cero`,
    )
  }
}

export function calculateLineSubtotal(
  quantity: number,
  unitPriceCents: number,
): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new RangeError(
      'La cantidad debe ser un número mayor que cero',
    )
  }

  assertNonNegativeCents(
    unitPriceCents,
    'El precio unitario',
  )

  const subtotalCents = Math.round(
    quantity * unitPriceCents,
  )

  assertNonNegativeCents(
    subtotalCents,
    'El subtotal de la partida',
  )

  return subtotalCents
}

export function calculateSubtotal(
  items: readonly SalesNoteItem[],
): number {
  return items.reduce((subtotalCents, item) => {
    const lineSubtotalCents = calculateLineSubtotal(
      item.quantity,
      item.unitPriceCents,
    )

    const nextSubtotal = subtotalCents + lineSubtotalCents

    assertNonNegativeCents(
      nextSubtotal,
      'El subtotal',
    )

    return nextSubtotal
  }, 0)
}

function calculateRateAmount(
  subtotalCents: number,
  rateBasisPoints: number,
): number {
  assertNonNegativeCents(subtotalCents, 'El subtotal')
  assertNonNegativeCents(
    rateBasisPoints,
    'La tasa',
  )

  return Math.round(
    subtotalCents *
      rateBasisPoints /
      BASIS_POINTS_DIVISOR,
  )
}

export function calculateVat(
  subtotalCents: number,
  applyVat: boolean,
): number {
  if (!applyVat) return 0

  return calculateRateAmount(
    subtotalCents,
    VAT_RATE_BASIS_POINTS,
  )
}

export function calculateResicoWithholding(
  subtotalCents: number,
  applyResicoWithholding: boolean,
): number {
  if (!applyResicoWithholding) return 0

  return calculateRateAmount(
    subtotalCents,
    RESICO_RATE_BASIS_POINTS,
  )
}

export function calculateTotal({
  subtotalCents,
  vatAmountCents,
  resicoAmountCents,
}: TotalInput): number {
  assertNonNegativeCents(subtotalCents, 'El subtotal')
  assertNonNegativeCents(vatAmountCents, 'El IVA')
  assertNonNegativeCents(
    resicoAmountCents,
    'La retención ISR',
  )

  const totalCents =
    subtotalCents +
    vatAmountCents -
    resicoAmountCents

  assertNonNegativeCents(totalCents, 'El total')

  return totalCents
}

export function calculatePaymentSummary(
  totalCents: number,
  payments: readonly PaymentInput[],
): PaymentSummary {
  assertNonNegativeCents(totalCents, 'El total')

  const paidCents = payments.reduce(
    (accumulatedCents, payment) => {
      assertPositiveCents(
        payment.amountCents,
        'El pago',
      )

      const nextPaidCents =
        accumulatedCents + payment.amountCents

      assertNonNegativeCents(
        nextPaidCents,
        'El total pagado',
      )

      return nextPaidCents
    },
    0,
  )

  if (paidCents > totalCents) {
    throw new RangeError(
      'Los pagos no pueden superar el total de la nota',
    )
  }

  const balanceCents = totalCents - paidCents

  let paymentStatus: PaymentStatus = 'unpaid'

  if (paidCents === totalCents && totalCents > 0) {
    paymentStatus = 'paid'
  } else if (paidCents > 0) {
    paymentStatus = 'partial'
  }

  return {
    paidCents,
    balanceCents,
    paymentStatus,
  }
}