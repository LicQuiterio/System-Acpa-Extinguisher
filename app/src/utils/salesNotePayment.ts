import type {
  PaymentStatus,
  SalesNoteAmounts,
} from '../types/salesNote'

export type AdditionalPaymentSummary = {
  paidCents: number
  balanceCents: number
  paymentStatus: PaymentStatus
}

export function calculateAdditionalPaymentSummary(
  amounts: Pick<
    SalesNoteAmounts,
    'totalCents' | 'paidCents' | 'balanceCents'
  >,
  paymentAmountCents: number,
): AdditionalPaymentSummary {
  if (
    !Number.isSafeInteger(amounts.totalCents) ||
    !Number.isSafeInteger(amounts.paidCents) ||
    !Number.isSafeInteger(amounts.balanceCents) ||
    amounts.totalCents < 0 ||
    amounts.paidCents < 0 ||
    amounts.balanceCents < 0 ||
    amounts.paidCents + amounts.balanceCents !==
      amounts.totalCents
  ) {
    throw new Error(
      'Los importes actuales de la nota no son válidos',
    )
  }

  if (
    !Number.isSafeInteger(paymentAmountCents) ||
    paymentAmountCents <= 0
  ) {
    throw new Error(
      'El pago debe ser mayor que cero',
    )
  }

  if (paymentAmountCents > amounts.balanceCents) {
    throw new Error(
      'El pago no puede ser mayor al saldo pendiente',
    )
  }

  const paidCents =
    amounts.paidCents + paymentAmountCents

  const balanceCents =
    amounts.balanceCents - paymentAmountCents

  return {
    paidCents,
    balanceCents,
    paymentStatus:
      balanceCents === 0 ? 'paid' : 'partial',
  }
}