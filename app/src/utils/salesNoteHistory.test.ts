import { describe, expect, it } from 'vitest'
import { resolveHistoryDelivery } from '../services/salesNoteService'
describe('resolveHistoryDelivery', () => {
  it('usa el bloque delivery de una nota nueva', () => {
    expect(
      resolveHistoryDelivery({
        delivery: {
          status: 'pending',
          scheduledDate: '2026-07-30',
          deliveredAt: null,
          deliveredBy: null,
        },
      } as never),
    ).toEqual({
      status: 'pending',
      scheduledDate: '2026-07-30',
      deliveredAt: null,
      deliveredBy: null,
      isLegacy: false,
    })
  })

  it('convierte una nota antigua pendiente', () => {
    expect(
      resolveHistoryDelivery({
        deliveryStatus: 'pending',
      }),
    ).toEqual({
      status: 'pending',
      scheduledDate: null,
      deliveredAt: null,
      deliveredBy: null,
      isLegacy: true,
    })
  })
})