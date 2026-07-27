import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import {
    createLocation,
    getClientLocations,
    setLocationActive,
    updateLocation
} from '../services/locationService'
import type {
  ClientLocation,
  ClientLocationInput,
} from '../types/client'
import { LocationExtinguishersSection } from './LocationExtinguishersSection'
type ClientLocationsSectionProps = {
    clientId: string
}

import { LocationServiceVisitsSection } from './LocationServiceVisitsSection'

function emptyLocation(clientId: string): ClientLocationInput {
    return {
        clientId,
        name: '',
        street: '',
        exteriorNumber: '',
        interiorNumber: '',
        neighborhood: '',
        postalCode: '',
        city: '',
        municipality: '',
        state: '',
        references: '',
        contactName: '',
        contactPhone: '',
        active: true,
    }
}

function locationToInput(
  location: ClientLocation,
): ClientLocationInput {
  return {
    clientId: location.clientId,
    name: location.name,
    street: location.street,
    exteriorNumber: location.exteriorNumber,
    interiorNumber: location.interiorNumber,
    neighborhood: location.neighborhood,
    postalCode: location.postalCode,
    city: location.city,
    municipality: location.municipality,
    state: location.state,
    references: location.references,
    contactName: location.contactName,
    contactPhone: location.contactPhone,
    active: location.active,
  }
}

function formatLocationAddress(location: ClientLocation) {
    const streetAddress = [
        location.street,
        location.exteriorNumber,
        location.interiorNumber
            ? `Int. ${location.interiorNumber}`
            : '',
    ]
       .filter(Boolean)
       .join(' ')

       const locality = [
        location.neighborhood
            ? `Colonia ${location.neighborhood}`
            : '',
        location.municipality || location.city,
        location.state,
        'México',
        location.postalCode,
       ]
       .filter(Boolean)
       .join(', ')

       return [streetAddress, locality]
          .filter(Boolean)
          .join(', ') || 'Dirección incompleta'
}

export function ClientLocationsSection({
    clientId,
}: ClientLocationsSectionProps) {
    const { user, member } = useAuth()

  const [locations, setLocations] = useState<ClientLocation[]>([])
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  const [form, setForm] = useState<ClientLocationInput>(
    emptyLocation(clientId),
  )

   const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const canManageLocations = member?.role !== 'technician'

  async function loadLocations() {
    if (!member) return

    try {
      const data = await getClientLocations(
        member.businessId,
        clientId,
      )

      setLocations(data)
    } catch {
      setError('No fue posible cargar las ubicaciones.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!member) return 

    let cancelled = false 

    getClientLocations(member.businessId, clientId).then((data) => {
        if (!cancelled) {
            setLocations(data)
        }
    }).catch(() => {
        if (!cancelled) {
            setError('No fue posible cargar las ubicaciones')
        }
    }).finally(() => {
        if (!cancelled) {
            setLoading(false)
        }
    })

    return () => {
        cancelled = true
    }
  }, [member, clientId])

function updateField(field: keyof ClientLocationInput, value: string) {
    setForm((currentForm) => ({
        ...currentForm, 
        [field]: value,
    }))
}
async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!member || !user) return

    if (!form.name.trim()) {
        setError('El nombre de la ubicación es obligatorio')
        return
    }
    if (!form.street.trim()) {
        setError('La calle es obligatoria')
        return
    }
    setSaving(true)
    setError('')

    try {
        if (editingLocationId) {
            await updateLocation(
                member.businessId,
                editingLocationId,
                user.uid,
                form
            ) 
        } else {
        await createLocation(member.businessId, user.uid, form)
            }
            setForm(emptyLocation(clientId))
            setEditingLocationId(null)
            setShowForm(false)
            await loadLocations()
        } catch {
          setError('No fue posible guardar la ubicación')
        } finally {
        setSaving(false)
    }
}

    function startEditing(location: ClientLocation) {
        setForm(locationToInput(location))
        setEditingLocationId(location.id)
        setShowForm(true)
        setError('')
    }

    async function handleStatusChange(location: ClientLocation) {
      if (!member || !user) return
        
      setSaving(true)
      setError('')
        
      try {
        await setLocationActive(
          member.businessId,
          location.id,
          user.uid,
          !location.active,
        )
    
        await loadLocations()
      } catch {
        setError('No fue posible cambiar el estado de la ubicación.')
      } finally {
        setSaving(false)
      }
    }

    function cancelForm() {
        setForm(emptyLocation(clientId))
        setEditingLocationId(null)
        setShowForm(false)
        setError('')
    }
    return (
        <section>
            <h2>Ubicaciones</h2>
            {canManageLocations && !showForm && (
                <button type='button' onClick={() => {setForm(emptyLocation(clientId)); setEditingLocationId(null); setError(''); setShowForm(true)}}>
                    Nueva ubicación
                </button>
            )}
            {showForm && canManageLocations && (
                <form onSubmit={handleSubmit}>
                    <h3>
                        {editingLocationId
                            ? 'Editar ubicación'
                            : 'Registrar ubicación'}
                    </h3>

                    <p>
                        <label>
                            Nombre de la ubicación *
                            <input value={form.name} placeholder='Ej. Sucursal centro' onChange={(event) => updateField('name', event.target.value)}/>
                        </label>
                    </p>
                    <p>
                        <label>
                            Calle *
                            <input value={form.street} onChange={(event) => updateField('street', event.target.value)}/>
                        </label>
                    </p>
                    <p>
                        <label>
                            Numero exterior
                            <input value={form.exteriorNumber} onChange={(event) => updateField('exteriorNumber', event.target.value)}/>
                        </label>
                    </p>
                    <p>
                        <label>
                            Numero interior
                            <input value={form.interiorNumber} onChange={(event) => updateField('interiorNumber', event.target.value)}/>
                        </label>
                    </p>
                     <p>
                        <label>
                            Colonia
                            <input value={form.neighborhood} onChange={(event) => updateField('neighborhood', event.target.value)}/>
                        </label>
                    </p>
                    <p>
                        <label>
                            Codigo Postal
                            <input value={form.postalCode} inputMode='numeric' onChange={(event) => updateField('postalCode', event.target.value)}/>
                        </label>
                    </p>
                    <p>
                        <label>
                            Ciudad
                            <input value={form.city} onChange={(event) => updateField('city', event.target.value)}/>
                        </label>
                    </p>
                    <p>
                        <label>
                            Municipio o alcaldía
                            <input value={form.municipality} onChange={(event) => updateField('municipality', event.target.value)}/>
                        </label>
                    </p>
                    <p>
                        <label>
                            Estado
                            <input value={form.state} onChange={(event) => updateField('state', event.target.value)}/>
                        </label>
                    </p>
                    <p>
                        <label>
                            Referencias
                            <textarea value={form.references} onChange={(event) => updateField('references', event.target.value)}/>
                        </label>
                    </p>

                    <p>
                        <label>
                            Contacto local
                            <input value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)}/>
                        </label>
                    </p>
                    <p>
                        <label>
                            Telefono del contacto
                            <input value={form.contactPhone} type='tel' onChange={(event) => updateField('contactPhone', event.target.value)}/>
                        </label>
                    </p>
                    <button type='submit' disabled={saving}>
                        {saving 
                            ? 'Guardando...' 
                            : editingLocationId
                              ? 'Guardar cambios'
                              : 'Guardar ubicación'}
                    </button>

                    <button type='button' disabled= {saving} onClick={cancelForm}>
                        Cancelar
                    </button>
                </form>
            )}
            {error && <p role='alert'>{error}</p>}
            {loading && <p>Cargando ubicaciones...</p>}
            {!loading && locations.length === 0 && (
                <p>Este cliente aún no tiene ubicaciones registradas</p>
            )}

            {!loading && locations.length > 0 && (
                <ul>
                    {locations
                        .filter((location) => location.id !== editingLocationId)
                        .map((location) => (
                        <li key={location.id}>
                            <h3>{location.name}</h3>

                            <p>{formatLocationAddress(location)}</p>


                            <p>
                                Contacto: {location.contactName || 'No registrado'}
                                {location.contactPhone
                                    ? ` ${location.contactPhone}`
                                    : ''}
                            </p>

                            <p>
                                Estado: {location.active ? 'Activa' : 'Inactiva'}
                            </p>
                            {canManageLocations && (
                              <p>
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => startEditing(location)}
                                >
                                  Editar
                                </button>
                                                        
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => handleStatusChange(location)}
                                >
                                  {location.active
                                    ? 'Desactivar ubicación'
                                    : 'Activar ubicación'}
                                </button>
                              </p>
                            )}
                            <LocationExtinguishersSection
                              clientId={clientId}
                              locationId={location.id}
                            />
                            <LocationServiceVisitsSection
                              clientId={clientId}
                              locationId={location.id}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
