import { describe, expect, it } from 'vitest'
import {
  normalizeSalesNoteReschedulingReason,
} from './salesNoteRescheduling'

describe(
  'normalizeSalesNoteReschedulingReason',
  () => {
    it('limpia los espacios del motivo', () => {
      expect(
        normalizeSalesNoteReschedulingReason(
          '  El extintor requiere más tiempo  ',
        ),
      ).toBe('El extintor requiere más tiempo')
    })

    it('rechaza un motivo vacío', () => {
      expect(() =>
        normalizeSalesNoteReschedulingReason(''),
      ).toThrow(
        'Explica el motivo de la reprogramación con al menos 10 caracteres',
      )
    })

    it('rechaza un motivo demasiado corto', () => {
      expect(() =>
        normalizeSalesNoteReschedulingReason(
          'Retraso',
        ),
      ).toThrow(
        'Explica el motivo de la reprogramación con al menos 10 caracteres',
      )
    })

    it('rechaza más de 500 caracteres', () => {
      expect(() =>
        normalizeSalesNoteReschedulingReason(
          'a'.repeat(501),
        ),
      ).toThrow(
        'El motivo de la reprogramación no puede superar 500 caracteres',
      )
    })
  },
)