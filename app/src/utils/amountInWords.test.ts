import { describe, expect, it } from 'vitest'
import { formatAmountInWords } from './amountInWords' 

describe('formatAmountInWords', () => {
  it('convierte cero pesos', () => {
    expect(formatAmountInWords(0)).toBe(
      'CERO PESOS 00/100 M.N.',
    )
  })

  it('usa singular para un peso', () => {
    expect(formatAmountInWords(100)).toBe(
      'UN PESO 00/100 M.N.',
    )
  })

  it('conserva los centavos con dos dígitos', () => {
    expect(formatAmountInWords(105)).toBe(
      'UN PESO 05/100 M.N.',
    )
  })

  it('convierte el total corregido del ejemplo', () => {
    expect(formatAmountInWords(276_080)).toBe(
      'DOS MIL SETECIENTOS SESENTA PESOS 80/100 M.N.',
    )
  })

  it('apocopa uno antes de pesos y miles', () => {
    expect(formatAmountInWords(2_110_100)).toBe(
      'VEINTIÚN MIL CIENTO UN PESOS 00/100 M.N.',
    )
  })

  it('agrega de para millones exactos', () => {
    expect(
      formatAmountInWords(100_000_000),
    ).toBe(
      'UN MILLÓN DE PESOS 00/100 M.N.',
    )
  })

  it('rechaza cantidades negativas', () => {
    expect(() =>
      formatAmountInWords(-1),
    ).toThrow(
      'El total debe expresarse en centavos enteros',
    )
  })

  it('rechaza cantidades con fracciones de centavo', () => {
    expect(() =>
      formatAmountInWords(10.5),
    ).toThrow(
      'El total debe expresarse en centavos enteros',
    )
  })
})