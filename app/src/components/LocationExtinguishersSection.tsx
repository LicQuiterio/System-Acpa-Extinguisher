import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { ExtinguisherMaintenancesSection } from './ExtinguisherMaintenancesSection'
import {
  createExtinguisher,
  getLocationExtinguishers,
  setExtinguisherActive,
  updateExtinguisher,
} from '../services/extinguisherService'
import {
  CAPACITY_UNITS,
  EXTINGUISHER_CONDITION_LABELS,
  EXTINGUISHER_CONDITIONS,
  EXTINGUISHER_TYPE_LABELS,
  EXTINGUISHER_TYPES,
  type Extinguisher,
  type ExtinguisherInput,
} from '../types/extinguisher'

type LocationExtinguishersSectionProps = {
  clientId: string
  locationId: string
}

function emptyExtinguisher(
  clientId: string,
  locationId: string,
): ExtinguisherInput {
  return {
    clientId,
    locationId,
    serialNumber: '',
    type: 'dry_chemical',
    capacityValue: 0,
    capacityUnit: 'kg',
    brand: '',
    model: '',
    condition: 'operational',
    lastServiceDate: '',
    nextServiceDate: '',
    notes: '',
    active: true,
  }
}

function timestampToDateInput(
  value: Extinguisher['lastServiceDate'],
): string {
  if (!value) {
    return ''
  }

  const date = value.toDate()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function extinguisherToInput(
  extinguisher: Extinguisher,
): ExtinguisherInput {
  return {
    clientId: extinguisher.clientId,
    locationId: extinguisher.locationId,
    serialNumber: extinguisher.serialNumber,
    type: extinguisher.type,
    capacityValue: extinguisher.capacityValue,
    capacityUnit: extinguisher.capacityUnit,
    brand: extinguisher.brand,
    model: extinguisher.model,
    condition: extinguisher.condition,
    lastServiceDate: timestampToDateInput(
      extinguisher.lastServiceDate,
    ),
    nextServiceDate: timestampToDateInput(
      extinguisher.nextServiceDate,
    ),
    notes: extinguisher.notes,
    active: extinguisher.active,
  }
}

function formatDate(value: Extinguisher['lastServiceDate']) {
  if (!value) {
    return 'No registrada'
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
  }).format(value.toDate())
}

export function LocationExtinguishersSection({
  clientId,
  locationId,
}: LocationExtinguishersSectionProps) {
  const { user, member } = useAuth()

  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([])
  const [form, setForm] = useState<ExtinguisherInput>(
    emptyExtinguisher(clientId, locationId),
  )
  const [editingExtinguisherId, setEditingExtinguisherId] = useState<
    string | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const canManageExtinguishers =
    member !== null && member.role !== 'technician'

  async function loadExtinguishers() {
    if (!member) {
      return
    }

    try {
      const data = await getLocationExtinguishers(
        member.businessId,
        locationId,
      )
      setExtinguishers(data)
    } catch {
      setError('No fue posible cargar los extintores.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!member) {
      return
    }

    let cancelled = false


    getLocationExtinguishers(member.businessId, locationId)
      .then((data) => {
        if (!cancelled) {
          setExtinguishers(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('No fue posible cargar los extintores.')
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
  }, [member, locationId])

  function updateField<K extends keyof ExtinguisherInput>(
    field: K,
    value: ExtinguisherInput[K],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!member || !user) {
      return
    }

    if (!form.serialNumber.trim()) {
      setError('La serie del extintor es obligatoria.')
      return
    }

    if (form.capacityValue <= 0) {
      setError('La capacidad debe ser mayor a cero.')
      return
    }

    if (!form.brand.trim()) {
      setError('La marca es obligatoria.')
      return
    }

    if (
      form.lastServiceDate &&
      form.nextServiceDate &&
      form.nextServiceDate < form.lastServiceDate
    ) {
      setError(
        'La próxima fecha de servicio no puede ser anterior al último servicio.',
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      if (editingExtinguisherId) {
        await updateExtinguisher(
          member.businessId,
          editingExtinguisherId,
          user.uid,
          form,
        )
      } else {
        await createExtinguisher(
          member.businessId,
          user.uid,
          form,
        )
      }

      setForm(emptyExtinguisher(clientId, locationId))
      setEditingExtinguisherId(null)
      setShowForm(false)
      await loadExtinguishers()
    } catch {
      setError('No fue posible guardar el extintor.')
    } finally {
      setSaving(false)
    }
  }

  function startEditing(extinguisher: Extinguisher) {
    setForm(extinguisherToInput(extinguisher))
    setEditingExtinguisherId(extinguisher.id)
    setShowForm(true)
    setError('')
  }

  async function handleStatusChange(extinguisher: Extinguisher) {
    if (!member || !user) {
      return
    }

    setSaving(true)
    setError('')

    try {
      await setExtinguisherActive(
        member.businessId,
        extinguisher.id,
        user.uid,
        !extinguisher.active,
      )
      await loadExtinguishers()
    } catch {
      setError('No fue posible cambiar el estado del extintor.')
    } finally {
      setSaving(false)
    }
  }

  function cancelForm() {
    setForm(emptyExtinguisher(clientId, locationId))
    setEditingExtinguisherId(null)
    setShowForm(false)
    setError('')
  }

  return (
    <section>
      <h4>Extintores</h4>

      {canManageExtinguishers && !showForm && (
        <button
          type="button"
          onClick={() => {
            setForm(emptyExtinguisher(clientId, locationId))
            setEditingExtinguisherId(null)
            setError('')
            setShowForm(true)
          }}
        >
          Registrar extintor
        </button>
      )}

      {showForm && canManageExtinguishers && (
        <form onSubmit={handleSubmit}>
          <h5>
            {editingExtinguisherId
              ? 'Editar extintor'
              : 'Registrar extintor'}
          </h5>

          <p>
            <label>
              Serie *
              <input
                value={form.serialNumber}
                onChange={(event) =>
                  updateField('serialNumber', event.target.value)
                }
              />
            </label>
          </p>

          <p>
            <label>
              Tipo *
              <select
                value={form.type}
                onChange={(event) =>
                  updateField(
                    'type',
                    event.target.value as ExtinguisherInput['type'],
                  )
                }
              >
                {EXTINGUISHER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EXTINGUISHER_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
          </p>

          <p>
            <label>
              Capacidad *
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={form.capacityValue || ''}
                onChange={(event) =>
                  updateField(
                    'capacityValue',
                    Number(event.target.value),
                  )
                }
              />
            </label>
          </p>

          <p>
            <label>
              Unidad *
              <select
                value={form.capacityUnit}
                onChange={(event) =>
                  updateField(
                    'capacityUnit',
                    event.target.value as ExtinguisherInput['capacityUnit'],
                  )
                }
              >
                {CAPACITY_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          </p>

          <p>
            <label>
              Marca *
              <input
                value={form.brand}
                onChange={(event) =>
                  updateField('brand', event.target.value)
                }
              />
            </label>
          </p>

          <p>
            <label>
              Modelo
              <input
                value={form.model}
                onChange={(event) =>
                  updateField('model', event.target.value)
                }
              />
            </label>
          </p>

          <p>
            <label>
              Estado operativo
              <select
                value={form.condition}
                onChange={(event) =>
                  updateField(
                    'condition',
                    event.target.value as ExtinguisherInput['condition'],
                  )
                }
              >
                {EXTINGUISHER_CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {EXTINGUISHER_CONDITION_LABELS[condition]}
                  </option>
                ))}
              </select>
            </label>
          </p>

          <p>
            <label>
              Último servicio
              <input
                type="date"
                value={form.lastServiceDate}
                onChange={(event) =>
                  updateField('lastServiceDate', event.target.value)
                }
              />
            </label>
          </p>

          <p>
            <label>
              Próximo servicio
              <input
                type="date"
                value={form.nextServiceDate}
                onChange={(event) =>
                  updateField('nextServiceDate', event.target.value)
                }
              />
            </label>
          </p>

          <p>
            <label>
              Notas
              <textarea
                value={form.notes}
                onChange={(event) =>
                  updateField('notes', event.target.value)
                }
              />
            </label>
          </p>

          <button type="submit" disabled={saving}>
            {saving
              ? 'Guardando...'
              : editingExtinguisherId
                ? 'Guardar cambios'
                : 'Guardar extintor'}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={cancelForm}
          >
            Cancelar
          </button>
        </form>
      )}

      {error && <p role="alert">{error}</p>}
      {loading && <p>Cargando extintores...</p>}

      {!loading && extinguishers.length === 0 && (
        <p>Esta ubicación aún no tiene extintores registrados.</p>
      )}

      {!loading && extinguishers.length > 0 && (
        <ul>
          {extinguishers
            .filter(
              (extinguisher) =>
                extinguisher.id !== editingExtinguisherId,
            )
            .map((extinguisher) => (
              <li key={extinguisher.id}>
                <h5>
                  {extinguisher.serialNumber} ·{' '}
                  {EXTINGUISHER_TYPE_LABELS[extinguisher.type]}
                </h5>
                <p>
                  {extinguisher.capacityValue}{' '}
                  {extinguisher.capacityUnit} ·{' '}
                  {extinguisher.brand}
                  {extinguisher.model
                    ? ` · ${extinguisher.model}`
                    : ''}
                </p>
                <p>
                  Estado: {
                    EXTINGUISHER_CONDITION_LABELS[
                      extinguisher.condition
                    ]
                  }
                </p>
                <p>
                  Último servicio: {formatDate(extinguisher.lastServiceDate)}
                  <br />
                  Próximo servicio: {formatDate(extinguisher.nextServiceDate)}
                </p>
                <p>
                  Registro: {extinguisher.active ? 'Activo' : 'Inactivo'}
                </p>

                {canManageExtinguishers && (
                  <p>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => startEditing(extinguisher)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        handleStatusChange(extinguisher)
                      }
                    >
                      {extinguisher.active
                        ? 'Desactivar extintor'
                        : 'Activar extintor'}
                    </button>
                  </p>
                )}
                <ExtinguisherMaintenancesSection
                  clientId={clientId}
                  locationId={locationId}
                  extinguisher={extinguisher}
                />
              </li>
            ))}
        </ul>
      )}
    </section>
  )
}