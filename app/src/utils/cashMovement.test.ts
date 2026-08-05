import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import type { CashMovement } from '../types/cashMovement'
import {
  calculateAccumulatedCashDailySummary,
  calculateCashDailySummary,
  getBusinessDate,
  resolveCashBusinessDate,
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

  it('solo permite cambiar la fecha en desarrollo', () => {
    expect(resolveCashBusinessDate('2026-08-05', '2026-08-06', true))
      .toBe('2026-08-06')
    expect(resolveCashBusinessDate('2026-08-05', '2026-08-06', false))
      .toBe('2026-08-05')
    expect(resolveCashBusinessDate('2026-08-05', 'fecha-invalida', true))
      .toBe('2026-08-05')
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
    ], 18_800)

    expect(summary).toEqual({
      openingBalanceCents: 18_800,
      cashIncomeCents: 10_000,
      electronicIncomeCents: 5_000,
      expenseCents: 2_500,
      withdrawalCents: 1_000,
      totalOutflowCents: 3_500,
      estimatedCashCents: 25_300,
    })
  })

  it('arrastra al día siguiente el saldo acumulado', () => {
    const movements = [
      movement({ amountCents: 30_000 }),
      movement({ type: 'expense', source: 'manual', amountCents: 10_000 }),
      movement({ businessDate: '2026-08-05', amountCents: 5_000 }),
    ]
    const secondDay = calculateAccumulatedCashDailySummary(
      movements,
      '2026-08-05',
      18_800,
    )

    expect(secondDay.openingBalanceCents).toBe(38_800)
    expect(secondDay.estimatedCashCents).toBe(43_800)
  })
})
