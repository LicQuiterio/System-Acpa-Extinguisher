import { describe, expect, it } from 'vitest'
import type {
  RegisterSalesNoteLoanInput,
} from '../types/salesNoteLoan'
import {
  normalizeLoanEquipmentCode,
  normalizeLoanReturnNotes,
  normalizeSalesNoteLoanInput,
  resolveSalesNoteLoanSummary,
} from './salesNoteLoan'

const validInput: RegisterSalesNoteLoanInput = {
  equipmentCode: 'ACPA-P-001',
  reason: 'recharge',
  agent: 'pqs',
  capacityValue: 4.5,
  capacityUnit: 'kg',
  outgoingCondition: 'Equipo en buenas condiciones',
}

describe('normalizeLoanEquipmentCode', () => {
  it('normaliza mayúsculas y separadores', () => {
    expect(
      normalizeLoanEquipmentCode(
        '  acpa p 001  ',
      ),
    ).toBe('ACPA-P-001')
  })

  it('elimina acentos y signos repetidos', () => {
    expect(
      normalizeLoanEquipmentCode(
        'áçpa---p/002',
      ),
    ).toBe('ACPA-P-002')
  })

  it('rechaza un código vacío', () => {
    expect(() =>
      normalizeLoanEquipmentCode(' --- '),
    ).toThrow(
      'El código del equipo es obligatorio',
    )
  })

  it('rechaza códigos mayores de 40 caracteres', () => {
    expect(() =>
      normalizeLoanEquipmentCode('A'.repeat(41)),
    ).toThrow(
      'El código del equipo no puede superar 40 caracteres',
    )
  })
})

describe('normalizeSalesNoteLoanInput', () => {
  it('normaliza el código y la condición', () => {
    expect(
      normalizeSalesNoteLoanInput({
        ...validInput,
        equipmentCode: ' acpa p 001 ',
        outgoingCondition:
          '  Equipo en buenas condiciones  ',
      }),
    ).toEqual({
      ...validInput,
      equipmentCode: 'ACPA-P-001',
      normalizedEquipmentCode: 'ACPA-P-001',
    })
  })

  it('rechaza capacidades iguales a cero', () => {
    expect(() =>
      normalizeSalesNoteLoanInput({
        ...validInput,
        capacityValue: 0,
      }),
    ).toThrow(
      'La capacidad debe ser mayor que cero',
    )
  })

  it('rechaza una condición vacía', () => {
    expect(() =>
      normalizeSalesNoteLoanInput({
        ...validInput,
        outgoingCondition: ' ',
      }),
    ).toThrow(
      'La condición de salida es obligatoria',
    )
  })
})

describe('normalizeLoanReturnNotes', () => {
  it('permite observaciones vacías', () => {
    expect(
      normalizeLoanReturnNotes('   '),
    ).toBe('')
  })

  it('limpia espacios', () => {
    expect(
      normalizeLoanReturnNotes(
        '  Devuelto sin daños  ',
      ),
    ).toBe('Devuelto sin daños')
  })

  it('rechaza más de 500 caracteres', () => {
    expect(() =>
      normalizeLoanReturnNotes('a'.repeat(501)),
    ).toThrow(
      'Las observaciones de devolución no pueden superar 500 caracteres',
    )
  })
})

describe('resolveSalesNoteLoanSummary', () => {
  it('interpreta una nota antigua como cero préstamos', () => {
    expect(
      resolveSalesNoteLoanSummary(),
    ).toEqual({
      totalCount: 0,
      activeCount: 0,
    })
  })

  it('conserva un resumen válido', () => {
    expect(
      resolveSalesNoteLoanSummary({
        totalCount: 3,
        activeCount: 2,
      }),
    ).toEqual({
      totalCount: 3,
      activeCount: 2,
    })
  })

  it('rechaza más préstamos activos que totales', () => {
    expect(() =>
      resolveSalesNoteLoanSummary({
        totalCount: 1,
        activeCount: 2,
      }),
    ).toThrow(
      'El resumen de préstamos no es válido',
    )
  })
})