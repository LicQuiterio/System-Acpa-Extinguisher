import { describe, expect, it } from 'vitest'
import {
  calculateAdditionalPaymentSummary,
} from './salesNotePayment'

describe('calculateAdditionalPaymentSummary', () => {
  it('registra un abono menor al saldo', () => {
    expect(
      calculateAdditionalPaymentSummary(
        {
          totalCents: 500_000,
          paidCents: 100_000,
          balanceCents: 400_000,
        },
        150_000,
      ),
    ).toEqual({
      paidCents: 250_000,
      balanceCents: 250_000,
      paymentStatus: 'partial',
    })
  })

  it('marca la nota como pagada al liquidar el saldo', () => {
    expect(
      calculateAdditionalPaymentSummary(
        {
          totalCents: 500_000,
          paidCents: 100_000,
          balanceCents: 400_000,
        },
        400_000,
      ),
    ).toEqual({
      paidCents: 500_000,
      balanceCents: 0,
      paymentStatus: 'paid',
    })
  })

  it('rechaza 4500 cuando el saldo restante es 4000', () => {
    expect(() =>
      calculateAdditionalPaymentSummary(
        {
          totalCents: 500_000,
          paidCents: 100_000,
          balanceCents: 400_000,
        },
        450_000,
      ),
    ).toThrow(
      'El pago no puede ser mayor al saldo pendiente',
    )
  })

  it.each([0, -100, 10.5])(
    'rechaza el importe inválido %s',
    (paymentAmountCents) => {
      expect(() =>
        calculateAdditionalPaymentSummary(
          {
            totalCents: 500_000,
            paidCents: 0,
            balanceCents: 500_000,
          },
          paymentAmountCents,
        ),
      ).toThrow('El pago debe ser mayor que cero')
    },
  )

  it('rechaza una nota con saldo inconsistente', () => {
    expect(() =>
      calculateAdditionalPaymentSummary(
        {
          totalCents: 500_000,
          paidCents: 100_000,
          balanceCents: 450_000,
        },
        100_000,
      ),
    ).toThrow(
      'Los importes actuales de la nota no son válidos',
    )
  })
})