import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getClients } from '../services/clientService'
import {
  getSalesClientDisplayName,
  isSalesClient,
  type Client,
} from '../types/client'

type ClientStatusFilter =
  | 'all'
  | 'active'
  | 'inactive'

type ClientTypeFilter =
  | 'all'
  | 'individual'
  | 'company'

function getClientName(client: Client): string {
  return isSalesClient(client)
    ? getSalesClientDisplayName(client)
    : client.name
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-MX')
    .trim()
}

export function ClientsPage() {
  const { member } = useAuth()

  const [clients, setClients] =
    useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<ClientStatusFilter>('all')
  const [typeFilter, setTypeFilter] =
    useState<ClientTypeFilter>('all')

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

  const filteredClients = useMemo(() => {
    const normalizedSearch =
      normalizeSearch(search)

    return clients.filter((client) => {
      const salesClient = isSalesClient(client)
        ? client
        : null

      const matchesStatus =
        statusFilter === 'all' ||
        client.active ===
          (statusFilter === 'active')

      const matchesType =
        typeFilter === 'all' ||
        salesClient?.type === typeFilter

      const searchableText = normalizeSearch(
        [
          getClientName(client),
          client.contactName,
          client.phone,
          client.email,
          salesClient?.address ?? '',
          salesClient?.serviceAreaSnapshot
            .displayName ?? '',
        ].join(' '),
      )

      return (
        matchesStatus &&
        matchesType &&
        searchableText.includes(normalizedSearch)
      )
    })
  }, [
    clients,
    search,
    statusFilter,
    typeFilter,
  ])

  if (!member) {
    return (
      <main>
        <p>No tienes una membresía activa.</p>
      </main>
    )
  }

  return (
    <main>
      <header>
        <h1>Clientes</h1>
        <p>
          Consulta y administra la información de
          tus clientes.
        </p>
      </header>

      {error && <p role="alert">{error}</p>}

      <section>
        <h2>Buscar clientes</h2>

        <div className="clients-filter-grid">
          <label htmlFor="clients-search">
            Nombre, teléfono o zona
            <input
              id="clients-search"
              type="search"
              value={search}
              placeholder="Buscar cliente"
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <label htmlFor="clients-status-filter">
            Estado
            <select
              id="clients-status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as ClientStatusFilter,
                )
              }
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">
                Inactivos
              </option>
            </select>
          </label>

          <label htmlFor="clients-type-filter">
            Tipo
            <select
              id="clients-type-filter"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target
                    .value as ClientTypeFilter,
                )
              }
            >
              <option value="all">Todos</option>
              <option value="individual">
                Particular
              </option>
              <option value="company">
                Empresa
              </option>
            </select>
          </label>
        </div>

        {!loading && (
          <p className="clients-results-count">
            Clientes encontrados:{' '}
            <strong>{filteredClients.length}</strong>
          </p>
        )}
      </section>

      <section>
        <h2>Lista de clientes</h2>

        {loading && (
          <div
            className="clients-table-skeleton"
            role="status"
            aria-label="Cargando clientes"
          >
            <div className="skeleton clients-table-skeleton-header" />
            <div className="skeleton clients-table-skeleton-row" />
            <div className="skeleton clients-table-skeleton-row" />
            <div className="skeleton clients-table-skeleton-row" />
          </div>
        )}

        {!loading && clients.length === 0 && (
          <p>Aún no hay clientes registrados.</p>
        )}

        {!loading &&
          clients.length > 0 &&
          filteredClients.length === 0 && (
            <p>
              Ningún cliente coincide con los
              filtros seleccionados.
            </p>
          )}

        {!loading &&
          filteredClients.length > 0 && (
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
                {filteredClients.map((client) => {
                  const salesClient =
                    isSalesClient(client)
                      ? client
                      : null

                  return (
                    <tr key={client.id}>
                      <td>
                        <Link
                          to={`/clients/${client.id}`}
                        >
                          {getClientName(client)}
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