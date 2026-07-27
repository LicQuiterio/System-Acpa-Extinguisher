import { describe, expect, it } from 'vitest'
import {
  convertItemDraft,
  createExtinguisherItemDraft,
  createGeneralProductItemDraft,
} from './salesNoteDraft'

describe('convertItemDraft', () => {
  it('convierte un servicio de extintor', () => {
    const draft =
      createExtinguisherItemDraft('service-1')

    draft.quantity = '2'
    draft.unitPrice = '400'

    expect(convertItemDraft(draft)).toMatchObject({
      id: 'service-1',
      type: 'extinguisher_service',
      quantity: 2,
      unitPriceCents: 40_000,
      lineSubtotalCents: 80_000,
    })
  })

  it('convierte un producto general', () => {
    const draft =
      createGeneralProductItemDraft('product-1')

    draft.description = '  Señalética  '
    draft.quantity = '3'
    draft.unitPrice = '12.50'

    expect(convertItemDraft(draft)).toMatchObject({
      description: 'Señalética',
      quantity: 3,
      unitPriceCents: 1_250,
      lineSubtotalCents: 3_750,
    })
  })

  it('rechaza productos sin descripción', () => {
    const draft =
      createGeneralProductItemDraft('product-2')

    draft.unitPrice = '100'

    expect(() =>
      convertItemDraft(draft),
    ).toThrow(
      'La descripción del producto es obligatoria',
    )
  })

  it('rechaza cantidades inválidas', () => {
    const draft =
      createExtinguisherItemDraft('service-2')

    draft.quantity = '0'
    draft.unitPrice = '400'

    expect(() =>
      convertItemDraft(draft),
    ).toThrow(
      'La cantidad debe ser mayor que cero',
    )
  })

  it('rechaza precios vacíos', () => {
    const draft =
      createExtinguisherItemDraft('service-3')

    expect(() =>
      convertItemDraft(draft),
    ).toThrow('El importe es obligatorio')
  })
})