import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import type { CashMovement } from '../types/cashMovement'
import {
  calculateCashDailySummary,
  getBusinessDate,
} from './cashMovement'

function movement(
  patch: Partial<CashMovement>,
): CashMovement {
  const timestamp = Timestamp.fromMillis(0)

  return {
    id: 'movement-1',
    businessDate: '2026-08-04',
    type: 'income',
    source: 'sales_payment',
    amountCents: 0,
    paymentMethod: 'cash',
    concept: 'Movimiento',
    quantity: 1,
    observations: '',
    noteId: null,
    folioDisplay: null,
    paymentId: null,
    occurredAt: timestamp,
    createdAt: timestamp,
    createdBy: 'user-1',
    ...patch,
  }
}

describe('getBusinessDate', () => {
  it('usa la fecha de Ciudad de Mexico', () => {
    expect(
      getBusinessDate(new Date('2026-08-05T04:30:00Z')),
    ).toBe('2026-08-04')
  })
})

describe('calculateCashDailySummary', () => {
  it('separa ingresos y calcula el efectivo estimado', () => {
    const summary = calculateCashDailySummary([
      movement({ amountCents: 10_000 }),
      movement({
        id: 'movement-2',
        amountCents: 5_000,
        paymentMethod: 'transfer',
      }),
      movement({
        id: 'movement-3',
        type: 'expense',
        source: 'manual',
        amountCents: 2_500,
      }),
      movement({
        id: 'movement-4',
        type: 'owner_withdrawal',
        source: 'manual',
        amountCents: 1_000,
      }),
    ])

    expect(summary).toEqual({
      cashIncomeCents: 10_000,
      electronicIncomeCents: 5_000,
      expenseCents: 2_500,
      withdrawalCents: 1_000,
      totalOutflowCents: 3_500,
      estimatedCashCents: 6_500,
    })
  })
})
