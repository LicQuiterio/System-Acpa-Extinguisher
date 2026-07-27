import { describe, expect, it } from 'vitest'
import {
  isValidScheduledDate,
  normalizeDeliveryInput,
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