import { describe, expect, it } from 'vitest'
import {
  formatCentsForInput,
  formatMoneyFromCents,
  parseMoneyToCents,
} from './money'

describe('parseMoneyToCents', () => {
  it('convierte pesos completos', () => {
    expect(parseMoneyToCents('400')).toBe(40_000)
  })

  it('convierte pesos con centavos', () => {
    expect(parseMoneyToCents('1549.13')).toBe(154_913)
  })

  it('acepta símbolo y separador de miles', () => {
    expect(
      parseMoneyToCents('$1,549.13'),
    ).toBe(154_913)
  })

  it('acepta coma decimal', () => {
    expect(parseMoneyToCents('400,50')).toBe(40_050)
  })

  it('rechaza más de dos decimales', () => {
    expect(() =>
      parseMoneyToCents('10.999'),
    ).toThrow()
  })

  it('rechaza importes negativos', () => {
    expect(() =>
      parseMoneyToCents('-10'),
    ).toThrow()
  })

  it('rechaza campos vacíos', () => {
    expect(() =>
      parseMoneyToCents(''),
    ).toThrow('El importe es obligatorio')
  })
})

describe('formato de dinero', () => {
  it('muestra moneda mexicana', () => {
    expect(
      formatMoneyFromCents(154_913),
    ).toBe('$1,549.13')
  })

  it('prepara centavos para un input', () => {
    expect(
      formatCentsForInput(40_050),
    ).toBe('400.50')
  })
})