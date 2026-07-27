import type { Municipality } from '../constants/serviceAreas'
import type { ServiceArea } from '../types/serviceArea'

export function normalizeServiceAreaName(
  value: string,
): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es-MX')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function buildServiceAreaDisplayName(
  locality: string,
  municipality: Municipality,
): string {
  const cleanLocality = locality
    .trim()
    .replace(/\s+/g, ' ')

  if (!cleanLocality) {
    throw new Error(
      'El nombre de la comunidad es obligatorio',
    )
  }

  if (
    normalizeServiceAreaName(cleanLocality) ===
    normalizeServiceAreaName(municipality)
  ) {
    return municipality
  }

  return `${cleanLocality}, ${municipality}`
}

type SearchableServiceArea = Pick<
  ServiceArea,
  | 'municipality'
  | 'locality'
  | 'displayName'
>

export function filterServiceAreas<
  T extends SearchableServiceArea,
>(
  areas: readonly T[],
  searchText: string,
  maximumResults = 10,
): T[] {
  const normalizedSearch =
    normalizeServiceAreaName(searchText)

  if (!normalizedSearch) {
    return areas.slice(0, maximumResults)
  }

  return areas
    .filter((area) => {
      const searchableText =
        normalizeServiceAreaName(
          [
            area.displayName,
            area.locality,
            area.municipality,
          ].join(' '),
        )

      return searchableText.includes(
        normalizedSearch,
      )
    })
    .slice(0, maximumResults)
}