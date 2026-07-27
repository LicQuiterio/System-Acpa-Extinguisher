import { describe, expect, it } from 'vitest'
import type { SalesNoteItem } from '../types/salesNote'
import {
  calculateLineSubtotal,
  calculatePaymentSummary,
  calculateResicoWithholding,
  calculateSubtotal,
  calculateTotal,
  calculateVat,
} from './salesCalculations'

const items: SalesNoteItem[] = [
  {
    id: 'item-1',
    type: 'extinguisher_service',
    service: 'recharge',
    agent: 'pqs',
    capacityValue: 6,
    capacityUnit: 'kg',
    quantity: 2,
    unitPriceCents: 40_000,
    lineSubtotalCents: 80_000,
    notes: '',
  },
  {
    id: 'item-2',
    type: 'general_product',
    description: 'Señalética',
    quantity: 3,
    unitPriceCents: 12_550,
    lineSubtotalCents: 37_650,
    notes: '',
  },
]

describe('calculateLineSubtotal', () => {
  it('multiplica cantidad por precio unitario', () => {
    expect(calculateLineSubtotal(2, 40_000)).toBe(80_000)
  })

  it('rechaza cantidades inválidas', () => {
    expect(() =>
      calculateLineSubtotal(0, 40_000),
    ).toThrow(RangeError)

    expect(() =>
      calculateLineSubtotal(Number.NaN, 40_000),
    ).toThrow(RangeError)
  })

  it('rechaza precios negativos', () => {
    expect(() =>
      calculateLineSubtotal(1, -1),
    ).toThrow(RangeError)
  })
})

describe('calculateSubtotal', () => {
  it('suma varias partidas recalculadas', () => {
    expect(calculateSubtotal(items)).toBe(117_650)
  })

  it('devuelve cero sin partidas', () => {
    expect(calculateSubtotal([])).toBe(0)
  })
})

describe('impuestos', () => {
  it('calcula IVA de 16 por ciento', () => {
    expect(calculateVat(100_000, true)).toBe(16_000)
  })

  it('calcula retención RESICO de 1.25 por ciento', () => {
    expect(
      calculateResicoWithholding(100_000, true),
    ).toBe(1_250)
  })

  it('devuelve cero cuando los impuestos no aplican', () => {
    expect(calculateVat(100_000, false)).toBe(0)

    expect(
      calculateResicoWithholding(100_000, false),
    ).toBe(0)
  })

  it('redondea cada impuesto a centavos', () => {
    expect(calculateVat(99_999, true)).toBe(16_000)

    expect(
      calculateResicoWithholding(99_999, true),
    ).toBe(1_250)
  })
})

describe('calculateTotal', () => {
  it('suma IVA y resta la retención RESICO', () => {
    expect(
      calculateTotal({
        subtotalCents: 100_000,
        vatAmountCents: 16_000,
        resicoAmountCents: 1_250,
      }),
    ).toBe(114_750)
  })
})

describe('calculatePaymentSummary', () => {
  it('identifica una nota sin pagos', () => {
    expect(
      calculatePaymentSummary(100_000, []),
    ).toEqual({
      paidCents: 0,
      balanceCents: 100_000,
      paymentStatus: 'unpaid',
    })
  })

  it('identifica pagos parciales', () => {
    expect(
      calculatePaymentSummary(100_000, [
        {
          amountCents: 50_000,
          method: 'cash',
        },
      ]),
    ).toEqual({
      paidCents: 50_000,
      balanceCents: 50_000,
      paymentStatus: 'partial',
    })
  })

  it('acepta pagos mixtos', () => {
    expect(
      calculatePaymentSummary(100_000, [
        {
          amountCents: 40_000,
          method: 'cash',
        },
        {
          amountCents: 60_000,
          method: 'transfer',
        },
      ]),
    ).toEqual({
      paidCents: 100_000,
      balanceCents: 0,
      paymentStatus: 'paid',
    })
  })

  it('rechaza pagos mayores al total', () => {
    expect(() =>
      calculatePaymentSummary(100_000, [
        {
          amountCents: 100_001,
          method: 'card',
        },
      ]),
    ).toThrow(
      'Los pagos no pueden superar el total de la nota',
    )
  })

  it('rechaza pagos de cero', () => {
    expect(() =>
      calculatePaymentSummary(100_000, [
        {
          amountCents: 0,
          method: 'cash',
        },
      ]),
    ).toThrow(RangeError)
  })
})