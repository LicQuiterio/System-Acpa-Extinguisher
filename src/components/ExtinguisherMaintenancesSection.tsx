import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { getActiveTechnicians } from '../services/memberService'
import type { MemberWithId } from '../types/member'
import {
  createMaintenance,
  getExtinguisherMaintenances,
} from '../services/maintenanceService'
import {
  MAINTENANCE_RESULT_LABELS,
  MAINTENANCE_RESULTS,
  type Maintenance,
  type MaintenanceInput,
} from '../types/maintenance'
import type { Extinguisher } from '../types/extinguisher'

type ExtinguisherMaintenancesSectionProps = {
  clientId: string
  locationId: string
  extinguisher: Extinguisher
}

function emptyMaintenance(
  clientId: string,
  locationId: string,
  extinguisherId: string,
  technicianId: string,
  technicianName: string,
): MaintenanceInput {
  return {
    clientId,
    locationId,
    extinguisherId,
    visitDate: '',
    technicianId,
    technicianName,
    result: 'completed',
    notes: '',
    nextServiceDate: '',
  }
}

function formatDate(value: Maintenance['visitDate'] | null) {
  if (!value) {
    return 'No registrada'
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
  }).format(value.toDate())
}

export function ExtinguisherMaintenancesSection({
  clientId,
  locationId,
  extinguisher,
}: ExtinguisherMaintenancesSectionProps) {
  const { user, member } = useAuth()

  const [maintenances, setMaintenances] = useState<Maintenance[]>([])
  const [form, setForm] = useState<MaintenanceInput>(
    emptyMaintenance(clientId, locationId, extinguisher.id, '', ''),
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [technicians, setTechnicians] = useState<MemberWithId[]>([])
  const [loadingTechnicians, setLoadingTechnicians] = useState(false)

  async function loadMaintenances() {
    if (!member) {
      return
    }

    try {
      const data = await getExtinguisherMaintenances(
        member.businessId,
        extinguisher.id,
      )
      setMaintenances(data)
    } catch {
      setError('No fue posible cargar los mantenimientos.')
    } finally {
      setLoading(false)
    }
  }

useEffect(() => {
  if (!member) {
    return
  }

  let cancelled = false

  getExtinguisherMaintenances(
    member.businessId,
    extinguisher.id,
  )
    .then((data) => {
      if (!cancelled) {
        setMaintenances(data)
      }
    })
    .catch(() => {
      if (!cancelled) {
        setError('No fue posible cargar los mantenimientos.')
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
}, [member, extinguisher.id])

  function updateField<K extends keyof MaintenanceInput>(
    field: K,
    value: MaintenanceInput[K],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  function selectTechnician(technicianId: string) {
  const selectedTechnician = technicians.find(
    (technician) => technician.id === technicianId,
  )

  if (!selectedTechnician) {
    return
  }

  setForm((currentForm) => ({
    ...currentForm,
    technicianId: selectedTechnician.id,
    technicianName:
      selectedTechnician.displayName || selectedTechnician.email,
  }))
}

  async function startNewMaintenance() {
  if (!user || !member) {
    return
  }

  setError('')

  if (member.role === 'technician') {
    setForm(
      emptyMaintenance(
        clientId,
        locationId,
        extinguisher.id,
        user.uid,
        member.displayName || member.email,
      ),
    )
    setShowForm(true)
    return
  }

  setLoadingTechnicians(true)

  try {
    const activeTechnicians = await getActiveTechnicians(
      member.businessId,
    )

    setTechnicians(activeTechnicians)

    if (activeTechnicians.length === 0) {
      setError(
        'No hay técnicos activos disponibles para asignar.',
      )
      return
    }

    const firstTechnician = activeTechnicians[0]

    setForm(
      emptyMaintenance(
        clientId,
        locationId,
        extinguisher.id,
        firstTechnician.id,
        firstTechnician.displayName || firstTechnician.email,
      ),
    )
    setShowForm(true)
  } catch (caughtError) {
  console.error('Error al cargar técnicos:', caughtError)
  setError('No fue posible cargar los técnicos.')
} finally {
    setLoadingTechnicians(false)
  }
}

  function cancelForm() {
    setShowForm(false)
    setError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user || !member) {
      return
    }

    if (!form.visitDate) {
      setError('La fecha de visita es obligatoria.')
      return
    }

    if (!form.technicianName.trim()) {
      setError('El nombre del técnico es obligatorio.')
      return
    }

    if (
      form.nextServiceDate &&
      form.nextServiceDate < form.visitDate
    ) {
      setError(
        'La próxima fecha de servicio no puede ser anterior a la visita.',
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      await createMaintenance(
        member.businessId,
        user.uid,
        form,
      )
      setShowForm(false)
      await loadMaintenances()
    } catch {
      setError('No fue posible registrar el mantenimiento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h5>Historial de mantenimientos</h5>

      {!showForm && (
        <button
          type="button"
          disabled={loadingTechnicians}
          onClick={() => void startNewMaintenance()}
        >
  {loadingTechnicians
    ? 'Cargando técnicos...'
    : 'Registrar mantenimiento'}
</button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit}>
          <p>
            <label>
              Fecha de visita *
              <input
                type="date"
                value={form.visitDate}
                onChange={(event) =>
                  updateField('visitDate', event.target.value)
                }
              />
            </label>
          </p>

          <p>
              <label>
                Técnico *
                {member?.role === 'technician' ? (
                  <input value={form.technicianName} readOnly />
                ) : (
                  <select
                    value={form.technicianId}
                    onChange={(event) =>
                      selectTechnician(event.target.value)
                    }
                  >
                    {technicians.map((technician) => (
                      <option key={technician.id} value={technician.id}>
                        {technician.displayName || technician.email}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </p>

          <p>
            <label>
              Resultado *
              <select
                value={form.result}
                onChange={(event) =>
                  updateField(
                    'result',
                    event.target.value as MaintenanceInput['result'],
                  )
                }
              >
                {MAINTENANCE_RESULTS.map((result) => (
                  <option key={result} value={result}>
                    {MAINTENANCE_RESULT_LABELS[result]}
                  </option>
                ))}
              </select>
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
              : 'Guardar mantenimiento'}
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
      {loading && <p>Cargando mantenimientos...</p>}

      {!loading && maintenances.length === 0 && (
        <p>Este extintor aún no tiene mantenimientos registrados.</p>
      )}

      {!loading && maintenances.length > 0 && (
        <ul>
          {maintenances.map((maintenance) => (
            <li key={maintenance.id}>
              <p>
                <strong>{formatDate(maintenance.visitDate)}</strong>
                {' · '}
                {MAINTENANCE_RESULT_LABELS[maintenance.result]}
              </p>
              <p>Técnico: {maintenance.technicianName}</p>
              <p>
                Próximo servicio:{' '}
                {formatDate(maintenance.nextServiceDate)}
              </p>
              {maintenance.notes && (
                <p>Notas: {maintenance.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}