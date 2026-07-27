import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  MUNICIPALITIES,
  type Municipality,
} from '../constants/serviceAreas'
import {
  createManualServiceArea,
  getActiveServiceAreas,
} from '../services/serviceAreaService'
import type { ServiceArea } from '../types/serviceArea'
import { filterServiceAreas } from '../utils/serviceAreaUtils'

type ServiceAreaComboboxProps = {
  businessId: string
  userId: string
  value: ServiceArea | null
  onChange: (area: ServiceArea | null) => void
  disabled?: boolean
}

export function ServiceAreaCombobox({
  businessId,
  userId,
  value,
  onChange,
  disabled = false,
}: ServiceAreaComboboxProps) {
  const [areas, setAreas] = useState<ServiceArea[]>([])
 const [searchText, setSearchText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateForm, setShowCreateForm] =
    useState(false)
  const [municipality, setMunicipality] =
    useState<Municipality>(MUNICIPALITIES[0])
  const [locality, setLocality] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

      useEffect(() => {
    let cancelled = false

    getActiveServiceAreas(businessId)
      .then((loadedAreas) => {
        if (!cancelled) {
          setAreas(loadedAreas)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            'No fue posible cargar las zonas y comunidades',
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [businessId])

  const hasSearchText =
    searchText.trim().length >= 2

    const filteredAreas = useMemo(
    () =>
      hasSearchText
        ? filterServiceAreas(areas, searchText)
        : [],
    [areas, searchText, hasSearchText],
  )

  const similarAreas = useMemo(
    () => filterServiceAreas(areas, locality, 5),
    [areas, locality],
  )

  function selectArea(area: ServiceArea) {
    onChange(area)
    setSearchText('')
    setIsOpen(false)
    setShowCreateForm(false)
    setError('')
  }

  async function handleCreate() {

    if (!locality.trim()) {
      setError(
        'Escribe el nombre de la comunidad',
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      const result = await createManualServiceArea(
        businessId,
        userId,
        {
          municipality,
          locality,
          source: 'manual',
        },
      )

      const loadedAreas =
        await getActiveServiceAreas(businessId)

      setAreas(loadedAreas)

      const selectedArea = loadedAreas.find(
        (area) => area.id === result.id,
      )

      if (!selectedArea) {
        throw new Error(
          'No fue posible recuperar la comunidad',
        )
      }

      selectArea(selectedArea)
      setLocality('')
      setMunicipality(MUNICIPALITIES[0])
    } catch (caughtError) {
      const detail =
        caughtError instanceof Error
          ? caughtError.message
          : ''

      setError(
        detail
          ? `No fue posible registrar la comunidad: ${detail}`
          : 'No fue posible registrar la comunidad',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="service-area-combobox">
      <label htmlFor="service-area-search">
        Zona o comunidad
      </label>

      <input
        id="service-area-search"
        type="search"
        autoComplete="off"
        placeholder="Buscar municipio o comunidad..."
        value={value?.displayName ?? searchText}
        disabled={disabled}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setSearchText(event.target.value)
          onChange(null)
          setIsOpen(true)
          setError('')
        }}
      />

      {loading && <p>Cargando zonas...</p>}

            {!loading && isOpen && (
        <div role="listbox">
          {!hasSearchText && (
            <p>
              Escribe al menos dos letras para buscar.
            </p>
          )}

          {hasSearchText &&
            filteredAreas.map((area) => (
              <button
                key={area.id}
                type="button"
                role="option"
                aria-selected={
                  value?.id === area.id
                }
                onClick={() => selectArea(area)}
              >
                <strong>{area.locality}</strong>
                {' — '}
                {area.municipality}
              </button>
            ))}

          {hasSearchText &&
            filteredAreas.length === 0 && (
              <p>
                No existe una comunidad con ese nombre.
              </p>
            )}

          {hasSearchText && (
            <button
              type="button"
              onClick={() => {
                setLocality(searchText.trim())
                setShowCreateForm(true)
                setIsOpen(false)
                setError('')
              }}
            >
              + Agregar “{searchText.trim()}” como
              nueva comunidad
            </button>
          )}
        </div>
      )}

      {showCreateForm && (
        <section aria-labelledby="new-service-area-title">
        <h3 id="new-service-area-title">
            Agregar comunidad
        </h3>

          <label htmlFor="new-locality">
            Comunidad
          </label>
          <input
            id="new-locality"
            value={locality}
            disabled={saving}
            onChange={(event) => {
              setLocality(event.target.value)
              setError('')
            }}
          />

          <label htmlFor="new-municipality">
            Municipio
          </label>
          <select
            id="new-municipality"
            value={municipality}
            disabled={saving}
            onChange={(event) =>
              setMunicipality(
                event.target.value as Municipality,
              )
            }
          >
            {MUNICIPALITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          {locality.trim() &&
            similarAreas.length > 0 && (
              <div>
                <p>Revisa estas coincidencias:</p>

                {similarAreas.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    disabled={saving}
                    onClick={() => selectArea(area)}
                  >
                    {area.displayName}
                  </button>
                ))}
              </div>
            )}

         <button type="button" disabled={saving} onClick={() => void handleCreate()}>
            {saving
              ? 'Guardando...'
              : 'Guardar comunidad'}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setShowCreateForm(false)
              setLocality('')
              setError('')
            }}
          >
            Cancelar
          </button>
        </section>
      )}

      {error && <p role="alert">{error}</p>}
    </section>
  )
}