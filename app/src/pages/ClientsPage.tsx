import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { SalesClientForm } from '../components/SalesClientForm'
import { getClients } from '../services/clientService'
import {
  getSalesClientDisplayName,
  isSalesClient,
  type Client,
} from '../types/client'
import { canManageSalesNotes } from '../types/member'

export function ClientsPage() {
  const { user, member } = useAuth()

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!member) return

    let cancelled = false

    getClients(member.businessId)
      .then((loadedClients) => {
        if (!cancelled) {
          setClients(loadedClients)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            'No fue posible cargar los clientes',
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
  }, [member])

  async function loadClients() {
    if (!member) return

    setLoading(true)
    setError('')

    try {
      const loadedClients = await getClients(
        member.businessId,
      )

      setClients(loadedClients)
    } catch {
      setError(
        'No fue posible cargar los clientes',
      )
    } finally {
      setLoading(false)
    }
  }

  if (!member || !user) {
    return (
      <main>
        <p>No tienes una membresía activa.</p>
      </main>
    )
  }

  const canCreateClient =
    canManageSalesNotes(member.role)

  return (
    <main>
      <header>
        <h1>Clientes</h1>
        <p>
          Administra los clientes de{' '}
          {member.businessId}
        </p>
      </header>

      {canCreateClient && !showForm && (
        <button
          type="button"
          onClick={() => {
            setShowForm(true)
            setError('')
          }}
        >
          Nuevo cliente
        </button>
      )}

      {showForm && canCreateClient && (
        <SalesClientForm
          businessId={member.businessId}
          userId={user.uid}
          onCancel={() => {
            setShowForm(false)
            setError('')
          }}
          onCreated={async () => {
            setShowForm(false)
            await loadClients()
          }}
        />
      )}

      {error && <p role="alert">{error}</p>}

      <section>
        <h2>Lista de clientes</h2>

        {loading && <p>Cargando clientes...</p>}

        {!loading && clients.length === 0 && (
          <p>Aún no hay clientes registrados.</p>
        )}

        {!loading && clients.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Zona</th>
                <th>Registro</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {clients.map((client) => {
                const salesClient =
                  isSalesClient(client)
                    ? client
                    : null

                const displayName = salesClient
                  ? getSalesClientDisplayName(
                      salesClient,
                    )
                  : client.name

                return (
                  <tr key={client.id}>
                    <td>
                      <Link
                        to={`/clients/${client.id}`}
                      >
                        {displayName}
                      </Link>
                    </td>

                    <td>{client.contactName}</td>
                    <td>{client.phone}</td>

                    <td>
                      {salesClient
                        ? salesClient
                            .serviceAreaSnapshot
                            .displayName
                        : 'Pendiente de actualizar'}
                    </td>

                    <td>
                      {salesClient
                        ? 'Ventas'
                        : 'Anterior'}
                    </td>

                    <td>
                      {client.active
                        ? 'Activo'
                        : 'Inactivo'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}