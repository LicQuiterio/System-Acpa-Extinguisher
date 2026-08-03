import {
  useState,
  type FormEvent,
} from 'react'
import {
  cancelSalesNote,
} from '../../services/salesNoteService'
import type {
  SalesNoteDetail,
} from '../../types/salesNote'

type SalesNoteCancellationActionProps = {
  note: SalesNoteDetail
  businessId: string
  noteId: string
  userId: string | null
  isOwner: boolean
  onRefresh: () => Promise<void>
}

export function SalesNoteCancellationAction({
  note,
  businessId,
  noteId,
  userId,
  isOwner,
  onRefresh,
}: SalesNoteCancellationActionProps) {
  const [formOpen, setFormOpen] =
    useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] =
    useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const canCancel =
    isOwner &&
    Boolean(userId) &&
    note.documentStatus === 'issued' &&
    note.amounts.paidCents === 0 &&
    note.delivery.status === 'pending' &&
    note.loanSummary.activeCount === 0

  function closeForm() {
    setFormOpen(false)
    setReason('')
    setError('')
  }

  async function handleCancel(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!userId) {
      return
    }

    const normalizedReason = reason.trim()

    if (normalizedReason.length < 10) {
      setError(
        'Explica el motivo con al menos 10 caracteres.',
      )
      return
    }

    const confirmed = window.confirm(
      `¿Confirmas la cancelación de la nota ${note.folioDisplay}? Esta acción no se puede revertir.`,
    )

    if (!confirmed) {
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      await cancelSalesNote(
        businessId,
        noteId,
        userId,
        normalizedReason,
      )

      await onRefresh()
      closeForm()

      setMessage(
        'Nota cancelada correctamente.',
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No fue posible cancelar la nota.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOwner) {
    return null
  }

  return (
    <>
      {message && (
        <p role="status">{message}</p>
      )}

      {error && (
        <p role="alert">{error}</p>
      )}

      {canCancel && !formOpen && (
        <p>
          <button
            type="button"
            onClick={() => {
              setFormOpen(true)
              setError('')
              setMessage('')
            }}
          >
            Cancelar nota
          </button>
        </p>
      )}

      {note.documentStatus === 'issued' &&
        note.amounts.paidCents > 0 && (
          <p>
            Esta nota tiene pagos registrados y no
            puede cancelarse.
          </p>
        )}

      {note.documentStatus === 'issued' &&
        note.delivery.status === 'delivered' && (
          <p>
            Esta nota ya fue entregada y no puede
            cancelarse.
          </p>
        )}

      {note.documentStatus === 'issued' &&
        note.loanSummary.activeCount > 0 && (
          <p>
            Devuelve todos los extintores prestados
            antes de cancelar la nota.
          </p>
        )}

      {formOpen && (
        <form onSubmit={handleCancel}>
          <fieldset disabled={submitting}>
            <legend>Cancelar nota</legend>

            <p>
              La cancelación conservará el folio y
              todos los datos de la nota.
            </p>

            <p>
              <label>
                Motivo de cancelación
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
                {submitting
                  ? 'Cancelando...'
                  : 'Confirmar cancelación'}
              </button>{' '}

              <button
                type="button"
                disabled={submitting}
                onClick={closeForm}
              >
                Cerrar
              </button>
            </p>
          </fieldset>
        </form>
      )}
    </>
  )
}