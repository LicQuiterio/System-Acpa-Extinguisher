import { describe, expect, it } from 'vitest'
import {
  buildServiceAreaDisplayName,
  filterServiceAreas,
  normalizeServiceAreaName,
} from './serviceAreaUtils'


describe('normalizeServiceAreaName', () => {
  it('elimina diferencias de acentos y mayúsculas', () => {
    expect(
      normalizeServiceAreaName('Othón P. Blanco'),
    ).toBe('othon p blanco')
  })

  it('elimina espacios adicionales', () => {
    expect(
      normalizeServiceAreaName(
        '  Felipe   Carrillo   Puerto  ',
      ),
    ).toBe('felipe carrillo puerto')
  })

  it('normaliza guiones y puntuación', () => {
    expect(
      normalizeServiceAreaName('X-Hazil'),
    ).toBe('x hazil')
  })

  it('acepta una cadena vacía', () => {
    expect(normalizeServiceAreaName('')).toBe('')
  })
})

describe('buildServiceAreaDisplayName', () => {
  it('combina comunidad y municipio', () => {
    expect(
      buildServiceAreaDisplayName(
        'Tihosuco',
        'Felipe Carrillo Puerto',
      ),
    ).toBe('Tihosuco, Felipe Carrillo Puerto')
  })

  it('no repite el nombre cuando representa al municipio', () => {
    expect(
      buildServiceAreaDisplayName(
        'Bacalar',
        'Bacalar',
      ),
    ).toBe('Bacalar')
  })
})

const areas = [
  {
    municipality: 'Felipe Carrillo Puerto',
    locality: 'Tihosuco',
    displayName: 'Tihosuco, Felipe Carrillo Puerto',
  },
  {
    municipality: 'Bacalar',
    locality: 'Limones',
    displayName: 'Limones, Bacalar',
  },
  {
    municipality: 'Othón P. Blanco',
    locality: 'Chetumal',
    displayName: 'Chetumal, Othón P. Blanco',
  },
] as const

describe('filterServiceAreas', () => {
  it('encuentra una comunidad por nombre', () => {
    expect(
      filterServiceAreas(areas, 'tihosuco'),
    ).toEqual([areas[0]])
  })

  it('encuentra resultados por municipio sin importar acentos', () => {
    expect(
      filterServiceAreas(areas, 'othon'),
    ).toEqual([areas[2]])
  })

  it('limita la cantidad de resultados', () => {
    expect(
      filterServiceAreas(areas, '', 2),
    ).toHaveLength(2)
  })
})