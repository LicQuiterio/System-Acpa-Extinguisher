import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import {
  getSalesNotesHistory,
} from '../services/salesNoteService'
import type {
  SalesNoteHistoryItem,
} from '../types/salesNote'
import { formatMoneyFromCents } from '../utils/money'

type DocumentStatusFilter =
  | 'all'
  | 'issued'
  | 'cancelled'

type PaymentStatusFilter =
  | 'all'
  | 'unpaid'
  | 'partial'
  | 'paid'

type DeliveryStatusFilter =
  | 'all'
  | 'pending'
  | 'delivered'

const DOCUMENT_STATUS_LABELS = {
  issued: 'Emitida',
  cancelled: 'Cancelada',
}

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Sin pago',
  partial: 'Pago parcial',
  paid: 'Pagada',
}

const DELIVERY_STATUS_LABELS = {
  pending: 'Pendiente',
  delivered: 'Entregada',
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatScheduledDate(
  scheduledDate: string | null,
): string {
  if (!scheduledDate) {
    return 'Sin fecha programada'
  }

  const [year, month, day] = scheduledDate
    .split('-')
    .map(Number)

  return formatDate(
    new Date(year, month - 1, day),
  )
}

function getCustomerName(
  note: SalesNoteHistoryItem,
): string {
  return note.customerSnapshot.type === 'company'
    ? note.customerSnapshot.companyName
    : note.customerSnapshot.contactName
}

function matchesSearch(
  note: SalesNoteHistoryItem,
  search: string,
): boolean {
  const normalizedSearch = search
    .trim()
    .toLocaleLowerCase('es-MX')

  if (!normalizedSearch) {
    return true
  }

  return (
    note.folioDisplay.includes(normalizedSearch) ||
    getCustomerName(note)
      .toLocaleLowerCase('es-MX')
      .includes(normalizedSearch)
  )
}

export function SalesNotesHistoryPage() {
  const { member } = useAuth()

  const [notes, setNotes] = useState<
    SalesNoteHistoryItem[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [
    documentStatus,
    setDocumentStatus,
  ] = useState<DocumentStatusFilter>('all')
  const [
    paymentStatus,
    setPaymentStatus,
  ] = useState<PaymentStatusFilter>('all')
  const [
    deliveryStatus,
    setDeliveryStatus,
  ] = useState<DeliveryStatusFilter>('all')

  async function loadHistory() {
    if (!member) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const loadedNotes =
        await getSalesNotesHistory(
          member.businessId,
        )

      setNotes(loadedNotes)
    } catch {
      setError(
        'No fue posible cargar el historial de notas',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
  if (!member) {
    return
  }

  let cancelled = false

  getSalesNotesHistory(member.businessId)
    .then((loadedNotes) => {
      if (!cancelled) {
        setNotes(loadedNotes)
      }
    })
    .catch(() => {
      if (!cancelled) {
        setError(
          'No fue posible cargar el historial de notas',
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

  const filteredNotes = useMemo(
    () =>
      notes.filter((note) => {
        const matchesDocumentStatus =
          documentStatus === 'all' ||
          note.documentStatus === documentStatus

        const matchesPaymentStatus =
          paymentStatus === 'all' ||
          note.paymentStatus === paymentStatus

        const matchesDeliveryStatus =
          deliveryStatus === 'all' ||
          note.delivery.status === deliveryStatus

        return (
          matchesSearch(note, search) &&
          matchesDocumentStatus &&
          matchesPaymentStatus &&
          matchesDeliveryStatus
        )
      }),
    [
      notes,
      search,
      documentStatus,
      paymentStatus,
      deliveryStatus,
    ],
  )

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
        <h1>Historial de notas</h1>

        <p>
          Consulta las notas registradas, sus pagos
          y entregas.
        </p>

        <p>
          <Link to="/sales/new">
            Crear nueva nota
          </Link>
        </p>
      </header>

      <section>
        <h2>Filtros</h2>

        <label htmlFor="sales-history-search">
          Buscar por folio o cliente
        </label>

        <input
          id="sales-history-search"
          type="search"
          value={search}
          placeholder="Ejemplo: 09600 o nombre del cliente"
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        <label htmlFor="sales-history-document-status">
          Estado de la nota
        </label>

        <select
          id="sales-history-document-status"
          value={documentStatus}
          onChange={(event) =>
            setDocumentStatus(
              event.target
                .value as DocumentStatusFilter,
            )
          }
        >
          <option value="all">Todas</option>
          <option value="issued">Emitidas</option>
          <option value="cancelled">
            Canceladas
          </option>
        </select>

        <label htmlFor="sales-history-payment-status">
          Estado de pago
        </label>

        <select
          id="sales-history-payment-status"
          value={paymentStatus}
          onChange={(event) =>
            setPaymentStatus(
              event.target
                .value as PaymentStatusFilter,
            )
          }
        >
          <option value="all">Todos</option>
          <option value="unpaid">Sin pago</option>
          <option value="partial">
            Pago parcial
          </option>
          <option value="paid">Pagadas</option>
        </select>

        <label htmlFor="sales-history-delivery-status">
          Estado de entrega
        </label>

        <select
          id="sales-history-delivery-status"
          value={deliveryStatus}
          onChange={(event) =>
            setDeliveryStatus(
              event.target
                .value as DeliveryStatusFilter,
            )
          }
        >
          <option value="all">Todas</option>
          <option value="pending">
            Pendientes
          </option>
          <option value="delivered">
            Entregadas
          </option>
        </select>

        <button
          type="button"
          disabled={loading}
          onClick={() => void loadHistory()}
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </section>

      {error && <p role="alert">{error}</p>}

      <section>
        <h2>
          Notas encontradas: {filteredNotes.length}
        </h2>

        {loading && <p>Cargando notas...</p>}

        {!loading && notes.length === 0 && (
          <p>
            Aún no hay notas de venta registradas.
          </p>
        )}

        {!loading &&
          notes.length > 0 &&
          filteredNotes.length === 0 && (
            <p>
              Ninguna nota coincide con los filtros.
            </p>
          )}

        {!loading && filteredNotes.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Cliente</th>
                <th>Emisión</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Saldo</th>
                <th>Pago</th>
                <th>Entrega</th>
              </tr>
            </thead>

            <tbody>
              {filteredNotes.map((note) => (
                <tr key={note.id}>
                  <td>{note.folioDisplay}</td>
                  <td>{getCustomerName(note)}</td>
                  <td>
                    {formatDate(
                      note.issuedAt.toDate(),
                    )}
                  </td>
                  <td>
                    {
                      DOCUMENT_STATUS_LABELS[
                        note.documentStatus
                      ]
                    }
                  </td>
                  <td>
                    {formatMoneyFromCents(
                      note.amounts.totalCents,
                    )}
                  </td>
                  <td>
                    {formatMoneyFromCents(
                      note.amounts.balanceCents,
                    )}
                  </td>
                  <td>
                    {
                      PAYMENT_STATUS_LABELS[
                        note.paymentStatus
                      ]
                    }
                  </td>
                  <td>
                    {
                      DELIVERY_STATUS_LABELS[
                        note.delivery.status
                      ]
                    }
                    <br />
                    {note.delivery.status ===
                    'pending'
                      ? formatScheduledDate(
                          note.delivery.scheduledDate,
                        )
                      : note.delivery.deliveredAt
                        ? formatDate(
                            note.delivery.deliveredAt.toDate(),
                          )
                        : 'Fecha no disponible'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}