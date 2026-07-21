import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { createClient, getClients, } from '../services/clientService'
import type { Client, ClientInput } from '../types/client'
import { Link } from 'react-router-dom'

const emptyClient: ClientInput = {
    name: '',
    legalName: '',
    rfc: '',
    contactName: '',
    phone: '',
    email: '',
    notes: '',
    active: true,
}

export function ClientsPage() {
    const { user, member } = useAuth()

    const [clients, setClients] = useState<Client[]>([])
    const [form, setForm] = useState<ClientInput>(emptyClient)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [error, setError] = useState('')

    const canManageClients = member?.role !== 'technician'

    async function loadClients() {
        if (!member) return 


        try {
            const data = await getClients(member.businessId)
            setClients(data)
        } catch  {
            setError('No fue posible cargar los clientes')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
  if (!member) return

  let cancelled = false

  getClients(member.businessId)
    .then((data) => {
      if (!cancelled) {
        setClients(data)
      }
    })
    .catch(() => {
      if (!cancelled) {
        setError('No fue posible cargar los clientes.')
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
}, [member])
    function updateField(
        field: keyof ClientInput,
        value: string | boolean,
    ) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value
        }))
    }

    async function handleSubmit(event:FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!member || !user) return 

        if (!form.name.trim()){
            setError('El nombre del cliente es obligatorio')
            return
        }

        if (!form.contactName.trim()) {
            setError('El nombre del contacto es obligatorio')
            return
        }

        if (!form.phone.trim()) {
            setError('El telefono es obligatorio')
            return
        }

        setSaving(true)
        setError('')

        try {
            await createClient(member.businessId, user.uid, form)
            setForm(emptyClient)
            setShowForm(false)
            await loadClients()
        } catch {
            setError('No fue posible guardar el cliente')
        } finally {
            setSaving(false)
        }
    }

    if (!member) {
        return <main><p>No tienes membresia Activa</p></main>
    }

    return (
        <main>
            <h1>Clientes</h1>

            <p>Administra los clientes de {member.businessId}</p>

            {canManageClients && (
                <button type='button' onClick={() => {setError(''); setShowForm(true)}}>
                    Nuevo Cliente
                </button>
            )}

            {showForm && (
                <section>
                    <h2>Registrar Cliente</h2>

                    <form onSubmit = {handleSubmit}>
                        <p>
                            <label>
                                Nombre Comercial o Nombre *
                                <input value={form.name} onChange={(event) => updateField('name', event.target.value)}/>
                            </label>
                        </p>
                         <p>
                            <label>
                                Razón social 
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
                                Contacto Principal * 
                                <input value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)}/>
                            </label>
                        </p>
                        <p>
                            <label>
                                Telefono * 
                                <input type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)}/>
                            </label>
                        </p>
                         <p>
                            <label>
                                Correo Electronico 
                                <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)}/>
                            </label>
                        </p>
                        <p>
                            <label>
                                Notas
                                <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)}/>
                            </label>
                        </p>

                        <button type="submit" disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar cliente'}
                        </button>

                        <button type='button' disabled={saving} onClick={() => {setForm(emptyClient); setShowForm(false); setError('')}}>
                            Cancelar
                        </button>
                    </form>
                </section>
            )}
            {error && <p role='alert'>{error}</p>}

            <section>
                <h2>Lista de Clientes</h2>

                {loading && <p>Cargando clientes...</p>}

                {!loading && clients.length === 0 && (
                    <p>Aun no hay clientes registrados</p>
                )}

                {!loading && clients.length > 0 && (
                   <table>
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Contacto</th>
                            <th>Teléfono</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map((client) => (
                            <tr key = {client.id}>
                                <td>
                                    <Link to={`/clients/${client.id}`}>
                                    {client.name}
                                    </Link>
                                </td>
                                <td>{client.contactName}</td>
                                <td>{client.phone}</td>
                                <td>{client.active ? 'activo' : 'inactivo'}</td>
                            </tr>
                        ))}
                    </tbody>
                   </table> 
                )}
            </section>
        </main>
    )
}