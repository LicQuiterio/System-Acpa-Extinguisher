import {
  useState,
  type FormEvent,
} from 'react'
import {
  markSalesNoteDelivered,
  rescheduleSalesNoteDelivery,
} from '../../services/salesNoteService'
import type {
  SalesNoteDetail,
} from '../../types/salesNote'

type SalesNoteDeliverySectionProps = {
  note: SalesNoteDetail
  businessId: string
  noteId: string
  userId: string | null
  canManage: boolean
  canReschedule: boolean
  memberNames: Record<string, string>
  onRefresh: () => Promise<void>
}

function formatTimestamp(
  timestamp: SalesNoteDetail['issuedAt'],
): string {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp.toDate())
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

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
  }).format(new Date(year, month - 1, day))
}

export function SalesNoteDeliverySection({
  note,
  businessId,
  noteId,
  userId,
  canManage,
  canReschedule,
  memberNames,
  onRefresh,
}: SalesNoteDeliverySectionProps) {
  const [formOpen, setFormOpen] =
    useState(false)
  const [scheduledDate, setScheduledDate] =
    useState('')
  const [reason, setReason] = useState('')
  const [rescheduling, setRescheduling] =
    useState(false)
  const [reschedulingError, setReschedulingError] =
    useState('')
  const [
    reschedulingMessage,
    setReschedulingMessage,
  ] = useState('')
  const [delivering, setDelivering] =
    useState(false)
  const [deliveryError, setDeliveryError] =
    useState('')
  const [deliveryMessage, setDeliveryMessage] =
    useState('')

  const canRescheduleDelivery =
    Boolean(userId) &&
    canReschedule &&
    note.documentStatus === 'issued' &&
    note.delivery.status === 'pending'

  const canMarkDelivered =
    Boolean(userId) &&
    canManage &&
    note.documentStatus === 'issued' &&
    note.delivery.status === 'pending'

  function openForm() {
    setFormOpen(true)
    setScheduledDate('')
    setReason('')
    setReschedulingError('')
    setReschedulingMessage('')
  }

  function closeForm() {
    setFormOpen(false)
    setScheduledDate('')
    setReason('')
    setReschedulingError('')
  }

  async function handleReschedule(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!userId) {
      return
    }

    setRescheduling(true)
    setReschedulingError('')
    setReschedulingMessage('')

    try {
      await rescheduleSalesNoteDelivery(
        businessId,
        noteId,
        userId,
        scheduledDate,
        reason,
      )

      await onRefresh()
      closeForm()

      setReschedulingMessage(
        'Fecha de entrega reprogramada correctamente.',
      )
    } catch (caughtError) {
      setReschedulingError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No fue posible reprogramar la entrega.',
      )
    } finally {
      setRescheduling(false)
    }
  }

  async function handleMarkDelivered() {
    if (!userId) {
      return
    }

    const confirmed = window.confirm(
      `¿Confirmas que la nota ${note.folioDisplay} ya fue entregada? Esta acción no se puede revertir.`,
    )

    if (!confirmed) {
      return
    }

    setDelivering(true)
    setDeliveryError('')
    setDeliveryMessage('')

    try {
      await markSalesNoteDelivered(
        businessId,
        noteId,
        userId,
      )

      await onRefresh()

      setDeliveryMessage(
        'Entrega registrada correctamente.',
      )
    } catch (caughtError) {
      setDeliveryError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No fue posible registrar la entrega.',
      )
    } finally {
      setDelivering(false)
    }
  }

  return (
    <section>
      <h2>Entrega</h2>

      <dl>
        <dt>Estado</dt>
        <dd>
          {note.delivery.status === 'delivered'
            ? 'Entregada'
            : 'Pendiente de entrega'}
        </dd>

        <dt>Fecha programada</dt>
        <dd>
          {formatScheduledDate(
            note.delivery.scheduledDate,
          )}
        </dd>

        {note.delivery.status === 'delivered' && (
          <>
            <dt>Fecha real de entrega</dt>
            <dd>
              {note.delivery.deliveredAt
                ? formatTimestamp(
                    note.delivery.deliveredAt,
                  )
                : 'No disponible'}
            </dd>

            <dt>Entregada por</dt>
            <dd>
              {note.delivery.deliveredBy
                ? memberNames[
                    note.delivery.deliveredBy
                  ] ??
                  note.delivery.deliveredBy
                : 'No disponible'}
            </dd>
          </>
        )}
      </dl>

      {reschedulingMessage && (
        <p role="status">
          {reschedulingMessage}
        </p>
      )}

      {reschedulingError && (
        <p role="alert">{reschedulingError}</p>
      )}

      {canRescheduleDelivery && !formOpen && (
        <p>
          <button
            type="button"
            onClick={openForm}
          >
            Reprogramar entrega
          </button>
        </p>
      )}

      {formOpen && (
        <form onSubmit={handleReschedule}>
          <fieldset disabled={rescheduling}>
            <legend>Reprogramar entrega</legend>

            <p>
              Fecha actual:{' '}
              <strong>
                {formatScheduledDate(
                  note.delivery.scheduledDate,
                )}
              </strong>
            </p>

            <p>
              <label>
                Nueva fecha programada
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(event) =>
                    setScheduledDate(
                      event.target.value,
                    )
                  }
                />
              </label>
            </p>

            <p>
              <label>
                Motivo de la reprogramación
                <textarea
                  required
                  minLength={10}
                  maxLength={500}
                  rows={4}
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                />
              </label>
            </p>

            <p>
              <button type="submit">
                {rescheduling
                  ? 'Guardando...'
                  : 'Confirmar nueva fecha'}
              </button>{' '}

              <button
                type="button"
                onClick={closeForm}
              >
                Cerrar
              </button>
            </p>
          </fieldset>
        </form>
      )}

      {deliveryMessage && (
        <p role="status">{deliveryMessage}</p>
      )}

      {deliveryError && (
        <p role="alert">{deliveryError}</p>
      )}

      {canMarkDelivered && (
        <p>
          <button
            type="button"
            disabled={delivering}
            onClick={handleMarkDelivered}
          >
            {delivering
              ? 'Registrando entrega...'
              : 'Marcar como entregada'}
          </button>
        </p>
      )}

      {note.documentStatus === 'cancelled' &&
        note.delivery.status === 'pending' && (
          <p>
            No se puede registrar la entrega de una
            nota cancelada.
          </p>
        )}

      {note.delivery.isLegacy && (
        <p>
          Esta nota utiliza el formato anterior de
          entrega; algunos datos pueden no estar
          disponibles.
        </p>
      )}

      {note.deliveryScheduleChanges.length >
        0 && (
        <>
          <h3>Historial de reprogramaciones</h3>

          <ol>
            {note.deliveryScheduleChanges.map(
              (change) => (
                <li key={change.id}>
                  <p>
                    <strong>
                      {formatScheduledDate(
                        change.previousScheduledDate,
                      )}
                    </strong>
                    {' → '}
                    <strong>
                      {formatScheduledDate(
                        change.newScheduledDate,
                      )}
                    </strong>
                  </p>

                  <p>
                    Motivo: {change.reason}
                  </p>

                  <p>
                    {formatTimestamp(
                      change.changedAt,
                    )}
                    {' · '}
                    {memberNames[
                      change.changedBy
                    ] ?? change.changedBy}
                  </p>
                </li>
              ),
            )}
          </ol>
        </>
      )}
    </section>
  )
}