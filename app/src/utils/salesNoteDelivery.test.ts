import { describe, expect, it } from 'vitest'
import {
  isValidScheduledDate,
  normalizeDeliveryInput,
  prepareDeliveryCompletion,
} from './salesNoteDelivery'

describe('isValidScheduledDate', () => {
  it('acepta una fecha válida', () => {
    expect(
      isValidScheduledDate('2026-07-30'),
    ).toBe(true)
  })

  it('rechaza una fecha inexistente', () => {
    expect(
      isValidScheduledDate('2026-02-30'),
    ).toBe(false)
  })

  it('rechaza formatos distintos', () => {
    expect(
      isValidScheduledDate('30/07/2026'),
    ).toBe(false)
  })
})

describe('normalizeDeliveryInput', () => {
  it('requiere fecha para una entrega pendiente', () => {
    expect(() =>
      normalizeDeliveryInput({
        status: 'pending',
        scheduledDate: '',
      }),
    ).toThrow(
      'Indica una fecha programada de entrega válida',
    )
  })

  it('acepta una entrega realizada sin fecha programada', () => {
    expect(
      normalizeDeliveryInput({
        status: 'delivered',
        scheduledDate: null,
      }),
    ).toEqual({
      status: 'delivered',
      scheduledDate: null,
    })
  })
})
describe('prepareDeliveryCompletion', () => {
  it('conserva la fecha programada', () => {
    expect(
      prepareDeliveryCompletion({
        status: 'pending',
        scheduledDate: '2026-07-30',
        deliveredAt: null,
        deliveredBy: null,
        isLegacy: false,
      }),
    ).toEqual({
      status: 'delivered',
      scheduledDate: '2026-07-30',
    })
  })

  it('permite completar una nota antigua pendiente', () => {
    expect(
      prepareDeliveryCompletion({
        status: 'pending',
        scheduledDate: null,
        deliveredAt: null,
        deliveredBy: null,
        isLegacy: true,
      }),
    ).toEqual({
      status: 'delivered',
      scheduledDate: null,
    })
  })

  it('rechaza una entrega ya completada', () => {
    expect(() =>
      prepareDeliveryCompletion({
        status: 'delivered',
        scheduledDate: null,
        deliveredAt: null,
        deliveredBy: null,
        isLegacy: true,
      }),
    ).toThrow(
      'La nota ya fue marcada como entregada',
    )
  })
})