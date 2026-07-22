import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ClientLocationsSection } from '../components/ClientLocationsSection'
import { 
    getClient,
    setClientActive,
    updateClient
} from '../services/clientService' 
import type { Client, ClientInput } from '../types/client'

function clientToInput(client: Client): ClientInput {
    return {
        name: client.name,
        legalName: client.legalName,
        rfc: client.rfc,
        contactName: client.contactName,
        phone: client.phone,
        email: client.email,
        notes: client.notes,
        active: client.active,
    }
}

export function ClientDetailPage() {
    const { clientId } = useParams()
    const { user, member } = useAuth()

    const [client, setClient] = useState<Client | null>(null)
    const [form, setForm] = useState<ClientInput | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const CanManageClients = member?.role !== 'technician'

    async function loadClient() {
        if (!member || !clientId) return 

        setLoading(true)
        setError('')

        try {
            const data = await getClient(member.businessId, clientId)

            if (!data) {
                setClient(null)
                setForm(null)
                setError('El cliente no existe')
                return 
            }

            setClient(data)
            setForm(clientToInput(data))
        } catch {
            setError('No fue posible cargar el cliente')
        } finally {
            setLoading(false)
        }
    }

  useEffect(() => {
        if (!member || !clientId) return

        let cancelled = false

        getClient(member.businessId, clientId)
            .then((data) => {
                if (cancelled) return

                if (!data) {
                    setError('El cliente no existe.')
                    return
                }

                setClient(data)
                setForm(clientToInput(data))
            })
            .catch(() => {
                if (!cancelled) {
                    setError('No fue posible cargar el cliente.')
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
    }, [member, clientId])

    function updateField(field: keyof ClientInput, value:string ) {
        setForm((currentForm) => {
            if (!currentForm) return currentForm

            return {
                ...currentForm,
                [field]: value,
            }
        })
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!member || !user || !clientId || !form) return 

        if (!form.name.trim()) {
            setError('El nombre del cliente es obligatorio')
            return
        }

        if (!form.contactName.trim()) {
            setError('El contacto principal es obligatorio')
            return
        }

        if (!form.phone.trim()) {
            setError('El teléfono es obligatorio')
            return
        }

        setSaving(true)
        setError('')

        try {
            await updateClient(
                member.businessId,
                clientId,
                user.uid,
                form,
            )

            await loadClient()
            setEditing(false)
        } catch {
            setError('No fue posible actualizar el cliente')
        } finally {
            setSaving(false)
        }
    }
    async function handleStatusChange() {
        if (!member || !user || !clientId || !client) return

        const newStatus = !client.active

        setSaving(true)
        setError('')

        try {
            await setClientActive(
                member.businessId,
                clientId,
                user.uid,
                newStatus,
            )

            await loadClient()
        } catch {
            setError('No fue posible cambiar el estado del cliente.')
        } finally {
            setSaving(false)
        }
    }

    function cancelEditing() {
        if (client) {
            setForm(clientToInput(client))
        }
        setEditing(false)
        setError('')
    }
    if (!member) {
        return (
            <main>
                <p>No tienes una membresía activa</p>
            </main>
        )
    }
    return (
        <main>
            <p>
                <Link to="/clients"> - Volver a clientes </Link>
            </p>
            {loading && <p>Cargando cliente...</p>}
            {error && <p role='alert'>{error}</p>}

            {!loading && client && form && (
                <>
                <header>
                    <h1>{client.name}</h1>
                    <p>Estado: {client.active ? 'Activo' : 'Inactivo' }</p>
                </header>
                {!editing && (
                    <section>
                        <h2>Informacion del cliente</h2>
                        <dl>
                            <dt>Razón social</dt>
                            <dd>{client.legalName || 'No registrada'}</dd>

                            <dt>RFC</dt>
                            <dd>{client.rfc || 'No registrado'}</dd>

                            <dt>Contacto principal</dt>
                            <dd>{client.contactName}</dd>

                            <dt>Télefono</dt>
                            <dd>{client.phone}</dd>

                            <dt>Correo Electronico</dt>
                            <dd>{client.email || 'No registrado'}</dd>

                            <dt>Notas</dt>
                            <dd>{client.notes || 'Sin notas'}</dd>
                        </dl>

                        {CanManageClients && (
                            <div>
                                <button type='button' disabled={saving} onClick={() => setEditing(true)}>
                                    Editar
                                </button>
                                <button type='button' disabled={saving} onClick={handleStatusChange}>
                                    {saving 
                                        ? 'Guardando...' 
                                        : client.active
                                            ? 'Desactivar cliente' 
                                            : 'Activar cliente'}
                                </button>
                            </div>
                        )}
                    </section>
                )}
                {editing && CanManageClients && (
                    <section>
                        <h2>Editar Cliente</h2>
                        <form onSubmit={handleSubmit}>
                            <p>
                                <label>
                                    Nombre Comercial o nombre* 
                                    <input value={form.name} onChange={(event) => updateField('name', event.target.value)}/>
                                </label>
                            </p>
                            <p>
                                <label>
                                    Razon social
                                    <input value={form.legalName} onChange={(event) => updateField('legalName', event.target.value)}/>
                                </label>
                            </p>
                            <p>
                                <label>
                                    RFC
                                    <input value={form.rfc} onChange={(event) => updateField('rfc', event.target.value)}/>
                                </label>
                            </p>
                            <p>
                                <label>
                                    Contacto Principal
                                    <input value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)}/>
                                </label>
                            </p>
                            <p>
                                <label>
                                    telefono*
                                    <input type= "tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)}/>
                                </label>
                            </p>
                            <p>
                                <label>
                                    Correo Electronico
                                    <input type='email' value={form.email} onChange={(event) => updateField('email', event.target.value)}/>
                                </label>
                            </p>
                            <p>
                                <label>
                                    Notas
                                    <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)}/>
                                </label>
                            </p>
                            <button type='submit' disabled={saving}>
                                {saving ? 'Guardando...' : "Guardar cambios"}
                            </button>
                            <br></br>
                            <button type='button' disabled={saving} onClick={cancelEditing}>
                                Cancelar
                            </button>
                        </form>
                    </section>
                )}
                <br></br>
                <ClientLocationsSection clientId={client.id} />
                </>
            )}
        </main>
    )
}

