import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { getActiveTechnicians } from '../services/memberService'
import {
  createServiceVisit,
  getLocationServiceVisits,
  updateServiceVisit,
  updateServiceVisitStatus,
} from '../services/serviceVisitService'
import type { MemberWithId } from '../types/member'
import {
  SERVICE_VISIT_STATUSES,
  SERVICE_VISIT_STATUS_LABELS,
  type ServiceVisit,
  type ServiceVisitInput,
} from '../types/serviceVisit'
import { ExtinguisherMaintenancesSection } from './ExtinguisherMaintenancesSection'
import { getLocationExtinguishers } from '../services/extinguisherService'
import type { Extinguisher } from '../types/extinguisher'

type LocationServiceVisitsSectionProps = {
  clientId: string
  locationId: string
}

function emptyServiceVisit(
  clientId: string,
  locationId: string,
  technicianId: string,
  technicianName: string,
): ServiceVisitInput {
  return {
    clientId,
    locationId,
    scheduledDate: '',
    completedDate: '',
    technicianId,
    technicianName,
    status: 'scheduled',
    notes: '',
  }
}

function timestampToDateInput(value: ServiceVisit['scheduledDate'] | null) {
  if (!value) {
    return ''
  }

  const date = value.toDate()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function serviceVisitToInput(visit: ServiceVisit): ServiceVisitInput {
  return {
    clientId: visit.clientId,
    locationId: visit.locationId,
    scheduledDate: timestampToDateInput(visit.scheduledDate),
    completedDate: timestampToDateInput(visit.completedDate),
    technicianId: visit.technicianId,
    technicianName: visit.technicianName,
    status: visit.status,
    notes: visit.notes,
  }
}

function formatDate(value: ServiceVisit['scheduledDate'] | null) {
  if (!value) {
    return 'No registrada'
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
  }).format(value.toDate())
}

export function LocationServiceVisitsSection({
  clientId,
  locationId,
}: LocationServiceVisitsSectionProps) {
  const { user, member } = useAuth()

  const [visits, setVisits] = useState<ServiceVisit[]>([])
  const [technicians, setTechnicians] = useState<MemberWithId[]>([])
  const [form, setForm] = useState<ServiceVisitInput>(
    emptyServiceVisit(clientId, locationId, '', ''),
  )
  const [visitExtinguishers, setVisitExtinguishers] = useState<Extinguisher[]>([])
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null)
  const [loadingVisitExtinguishers, setLoadingVisitExtinguishers] =
  useState(false)
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTechnicians, setLoadingTechnicians] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const canManageVisits = member?.role !== 'technician'

  async function toggleVisitMaintenances(visit: ServiceVisit) {
  if (!member) {
    return
  }

  if (expandedVisitId === visit.id) {
    setExpandedVisitId(null)
    return
  }

  setLoadingVisitExtinguishers(true)
  setError('')

  try {
    const extinguishers = await getLocationExtinguishers(
      member.businessId,
      locationId,
    )

    setVisitExtinguishers(
      extinguishers.filter((extinguisher) => extinguisher.active),
    )
    setExpandedVisitId(visit.id)
  } catch {
    setError('No fue posible cargar los extintores de la visita.')
  } finally {
    setLoadingVisitExtinguishers(false)
  }
}

  async function loadVisits() {
    if (!member) {
      return
    }

    try {
      const data = await getLocationServiceVisits(
        member.businessId,
        locationId,
      )
      setVisits(data)
    } catch {
      setError('No fue posible cargar las visitas.')
    } finally {
      setLoading(false)
    }
  }

 useEffect(() => {
  if (!member) {
    return
  }

  let cancelled = false

  getLocationServiceVisits(member.businessId, locationId)
    .then((data) => {
      if (!cancelled) {
        setVisits(data)
      }
    })
    .catch(() => {
      if (!cancelled) {
        setError('No fue posible cargar las visitas.')
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

  function updateField<K extends keyof ServiceVisitInput>(
    field: K,
    value: ServiceVisitInput[K],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  function selectTechnician(technicianId: string) {
    const technician = technicians.find(
      (currentTechnician) => currentTechnician.id === technicianId,
    )

    if (!technician) {
      return
    }

    setForm((currentForm) => ({
      ...currentForm,
      technicianId: technician.id,
      technicianName: technician.displayName || technician.email,
    }))
  }

  async function startNewVisit() {
    if (!member) {
      return
    }

    setError('')
    setLoadingTechnicians(true)

    try {
      const activeTechnicians = await getActiveTechnicians(
        member.businessId,
      )

      if (activeTechnicians.length === 0) {
        setError('No hay técnicos activos disponibles para asignar.')
        return
      }

      const firstTechnician = activeTechnicians[0]

      setTechnicians(activeTechnicians)
      setForm(
        emptyServiceVisit(
          clientId,
          locationId,
          firstTechnician.id,
          firstTechnician.displayName || firstTechnician.email,
        ),
      )
      setEditingVisitId(null)
      setShowForm(true)
    } catch {
      setError('No fue posible cargar los técnicos.')
    } finally {
      setLoadingTechnicians(false)
    }
  }

  async function startEditing(visit: ServiceVisit) {
    if (!member) {
      return
    }

    setError('')
    setLoadingTechnicians(true)

    try {
      const activeTechnicians = await getActiveTechnicians(
        member.businessId,
      )

      setTechnicians(activeTechnicians)
      setForm(serviceVisitToInput(visit))
      setEditingVisitId(visit.id)
      setShowForm(true)
    } catch {
      setError('No fue posible cargar los técnicos.')
    } finally {
      setLoadingTechnicians(false)
    }
  }

  function cancelForm() {
    setForm(emptyServiceVisit(clientId, locationId, '', ''))
    setEditingVisitId(null)
    setShowForm(false)
    setError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!member || !user) {
      return
    }

    if (!form.scheduledDate) {
      setError('La fecha programada es obligatoria.')
      return
    }

    if (!form.technicianId || !form.technicianName.trim()) {
      setError('Debes asignar un técnico.')
      return
    }

    if (form.status === 'completed' && !form.completedDate) {
      setError('La fecha de finalización es obligatoria.')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (editingVisitId) {
        await updateServiceVisit(
          member.businessId,
          editingVisitId,
          user.uid,
          form,
        )
      } else {
        await createServiceVisit(
          member.businessId,
          user.uid,
          form,
        )
      }

      cancelForm()
      await loadVisits()
    } catch {
      setError('No fue posible guardar la visita.')
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(
    visit: ServiceVisit,
    status: 'in_progress' | 'completed',
  ) {
    if (!member || !user) {
      return
    }

    setSaving(true)
    setError('')

    try {
      await updateServiceVisitStatus(
        member.businessId,
        visit.id,
        user.uid,
        status,
      )
      await loadVisits()
    } catch {
      setError('No fue posible actualizar el estado de la visita.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h4>Servicios y visitas</h4>

      {canManageVisits && !showForm && (
        <button
          type="button"
          disabled={loadingTechnicians}
          onClick={() => void startNewVisit()}
        >
          {loadingTechnicians
            ? 'Cargando técnicos...'
            : 'Programar visita'}
        </button>
      )}

      {showForm && canManageVisits && (
        <form onSubmit={handleSubmit}>
          <h5>
            {editingVisitId ? 'Editar visita' : 'Programar visita'}
          </h5>

          <p>
            <label>
              Fecha programada *
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(event) =>
                  updateField('scheduledDate', event.target.value)
                }
              />
            </label>
          </p>

          <p>
            <label>
              Técnico *
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
            </label>
          </p>

          {editingVisitId && (
            <p>
              <label>
                Estado *
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField(
                      'status',
                      event.target.value as ServiceVisitInput['status'],
                    )
                  }
                >
                  {SERVICE_VISIT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {SERVICE_VISIT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
            </p>
          )}

          {form.status === 'completed' && (
            <p>
              <label>
                Fecha de finalización *
                <input
                  type="date"
                  value={form.completedDate}
                  onChange={(event) =>
                    updateField('completedDate', event.target.value)
                  }
                />
              </label>
            </p>
          )}

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
            {saving ? 'Guardando...' : 'Guardar visita'}
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
      {loading && <p>Cargando visitas...</p>}

      {!loading && visits.length === 0 && (
        <p>Esta ubicación aún no tiene visitas programadas.</p>
      )}

      {!loading && visits.length > 0 && (
        <ul>
          {visits.map((visit) => {
            const isAssignedTechnician =
              member?.role === 'technician' &&
              user?.uid === visit.technicianId

              const canRegisterMaintenances =
              visit.status === 'in_progress' &&
              (canManageVisits || isAssignedTechnician)
              
              const isVisitExpanded = expandedVisitId === visit.id

            return (
              <li key={visit.id}>
                <p>
                  <strong>{formatDate(visit.scheduledDate)}</strong>
                  {' · '}
                  {SERVICE_VISIT_STATUS_LABELS[visit.status]}
                </p>
                <p>Técnico: {visit.technicianName}</p>

                {visit.completedDate && (
                  <p>
                    Finalizada: {formatDate(visit.completedDate)}
                  </p>
                )}

                {visit.notes && <p>Notas: {visit.notes}</p>}

                {canManageVisits && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void startEditing(visit)}
                  >
                    Editar
                  </button>
                )}

                {isAssignedTechnician &&
                  visit.status === 'scheduled' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void changeStatus(visit, 'in_progress')
                      }
                    >
                      Iniciar visita
                    </button>
                  )}

                {isAssignedTechnician &&
                  visit.status === 'in_progress' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void changeStatus(visit, 'completed')
                      }
                    >
                      Finalizar visita
                    </button>

                
                  )}
                  {canRegisterMaintenances && (
                  <button
                    type="button"
                    disabled={saving || loadingVisitExtinguishers}
                    onClick={() => void toggleVisitMaintenances(visit)}
                  >
                    {isVisitExpanded
                      ? 'Ocultar extintores'
                      : 'Registrar mantenimientos'}
                  </button>
                )}

                {isVisitExpanded && (
                  <section>
                    <h5>Extintores atendidos en esta visita</h5>
                
                    {loadingVisitExtinguishers && (
                      <p>Cargando extintores...</p>
                    )}

                    {!loadingVisitExtinguishers &&
                      visitExtinguishers.length === 0 && (
                        <p>Esta ubicación no tiene extintores activos.</p>
                      )}

                    {!loadingVisitExtinguishers &&
                      visitExtinguishers.map((extinguisher) => (
                        <div key={extinguisher.id}>
                          <h6>
                            {extinguisher.serialNumber} · {extinguisher.brand}
                          </h6>
                    
                          <ExtinguisherMaintenancesSection
                            clientId={clientId}
                            locationId={locationId}
                            extinguisher={extinguisher}
                            serviceVisitId={visit.id}
                          />
                        </div>
                      ))}
                  </section>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}