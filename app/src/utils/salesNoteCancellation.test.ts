import { describe, expect, it } from 'vitest'
import {
  normalizeSalesNoteCancellationReason,
} from './salesNoteCancellation'

describe(
  'normalizeSalesNoteCancellationReason',
  () => {
    it('limpia espacios del motivo', () => {
      expect(
        normalizeSalesNoteCancellationReason(
          '  Error al registrar al cliente  ',
        ),
      ).toBe('Error al registrar al cliente')
    })

    it('rechaza un motivo vacío', () => {
      expect(() =>
        normalizeSalesNoteCancellationReason(''),
      ).toThrow(
        'Explica el motivo de cancelación con al menos 10 caracteres',
      )
    })

    it('rechaza un motivo demasiado corto', () => {
      expect(() =>
        normalizeSalesNoteCancellationReason(
          'Un error',
        ),
      ).toThrow(
        'Explica el motivo de cancelación con al menos 10 caracteres',
      )
    })

    it('rechaza más de 500 caracteres', () => {
      expect(() =>
        normalizeSalesNoteCancellationReason(
          'a'.repeat(501),
        ),
      ).toThrow(
        'El motivo de cancelación no puede superar 500 caracteres',
      )
    })
  },
)