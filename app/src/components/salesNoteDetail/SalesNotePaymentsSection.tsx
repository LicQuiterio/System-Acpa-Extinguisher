import {
  useState,
  type FormEvent,
} from 'react'
import {
  registerSalesNotePayment,
} from '../../services/salesNoteService'
import type {
  PaymentMethod,
  SalesNoteDetail,
} from '../../types/salesNote'
import {
  formatCentsForInput,
  formatMoneyFromCents,
  parseMoneyToCents,
} from '../../utils/money'

const PAYMENT_METHOD_LABELS: Record<
  PaymentMethod,
  string
> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
}

type SalesNotePaymentsSectionProps = {
  note: SalesNoteDetail
  businessId: string
  noteId: string
  userId: string | null
  canManage: boolean
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

export function SalesNotePaymentsSection({
  note,
  businessId,
  noteId,
  userId,
  canManage,
  memberNames,
  onRefresh,
}: SalesNotePaymentsSectionProps) {
  const [formOpen, setFormOpen] =
    useState(false)
  const [method, setMethod] =
    useState<PaymentMethod>('cash')
  const [amount, setAmount] = useState('')
  const [pendingAmountCents, setPendingAmountCents] =
    useState<number | null>(null)
  const [submitting, setSubmitting] =
    useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const canRegisterPayment =
    Boolean(userId) &&
    canManage &&
    note.documentStatus === 'issued' &&
    note.amounts.balanceCents > 0

  function closeForm() {
    setFormOpen(false)
    setAmount('')
    setMethod('cash')
    setPendingAmountCents(null)
    setError('')
  }

  function handleReview(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      const amountCents =
        parseMoneyToCents(amount)

      if (amountCents <= 0) {
        throw new Error(
          'El pago debe ser mayor que cero.',
        )
      }

      if (
        amountCents >
        note.amounts.balanceCents
      ) {
        throw new Error(
          `El pago no puede superar el saldo de ${formatMoneyFromCents(
            note.amounts.balanceCents,
          )}.`,
        )
      }

      setPendingAmountCents(amountCents)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'El importe no es válido.',
      )
    }
  }

  async function handleConfirm() {
    if (!userId || !pendingAmountCents) {
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      await registerSalesNotePayment(
        businessId,
        noteId,
        userId,
        {
          amountCents: pendingAmountCents,
          method,
        },
      )

      await onRefresh()
      closeForm()

      setMessage(
        'Pago registrado correctamente.',
      )
    } catch (caughtError) {
      setPendingAmountCents(null)

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No fue posible registrar el pago.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <h2>Pagos registrados</h2>

      <p>
        Saldo disponible para pagos:{' '}
        <strong>
          {formatMoneyFromCents(
            note.amounts.balanceCents,
          )}
        </strong>
      </p>

      {message && (
        <p role="status">{message}</p>
      )}

      {error && (
        <p role="alert">{error}</p>
      )}

      {note.documentStatus === 'cancelled' && (
        <p>
          No se pueden registrar pagos en una nota
          cancelada.
        </p>
      )}

      {note.documentStatus === 'issued' &&
        note.amounts.balanceCents === 0 && (
          <p>
            Esta nota está completamente pagada.
          </p>
        )}

      {canRegisterPayment && !formOpen && (
        <p>
          <button
            type="button"
            onClick={() => {
              setFormOpen(true)
              setError('')
              setMessage('')
            }}
          >
            Registrar pago
          </button>
        </p>
      )}

      {formOpen &&
        pendingAmountCents === null && (
          <form onSubmit={handleReview}>
            <fieldset disabled={submitting}>
              <legend>Nuevo pago</legend>

              <p>
                <label>
                  Método de pago
                  <select
                    value={method}
                    onChange={(event) =>
                      setMethod(
                        event.target
                          .value as PaymentMethod,
                      )
                    }
                  >
                    <option value="cash">
                      Efectivo
                    </option>
                    <option value="transfer">
                      Transferencia
                    </option>
                    <option value="card">
                      Tarjeta
                    </option>
                  </select>
                </label>
              </p>

              <p>
                <label>
                  Importe
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max={
                      note.amounts.balanceCents /
                      100
                    }
                    step="0.01"
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>
              </p>

              <p>
                <button
                  type="button"
                  onClick={() =>
                    setAmount(
                      formatCentsForInput(
                        note.amounts
                          .balanceCents,
                      ),
                    )
                  }
                >
                  Usar saldo completo
                </button>
              </p>

              <p>
                <button
                  type="button"
                  onClick={closeForm}
                >
                  Cancelar
                </button>{' '}

                <button type="submit">
                  Revisar pago
                </button>
              </p>
            </fieldset>
          </form>
        )}

      {formOpen &&
        pendingAmountCents !== null && (
          <div>
            <h3>Confirmar pago</h3>

            <dl>
              <dt>Método</dt>
              <dd>
                {PAYMENT_METHOD_LABELS[method]}
              </dd>

              <dt>Importe</dt>
              <dd>
                <strong>
                  {formatMoneyFromCents(
                    pendingAmountCents,
                  )}
                </strong>
              </dd>

              <dt>Saldo después del pago</dt>
              <dd>
                {formatMoneyFromCents(
                  note.amounts.balanceCents -
                    pendingAmountCents,
                )}
              </dd>
            </dl>

            <p>
              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  setPendingAmountCents(null)
                }
              >
                Regresar
              </button>{' '}

              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirm}
              >
                {submitting
                  ? 'Registrando...'
                  : 'Confirmar pago'}
              </button>
            </p>
          </div>
        )}

      {note.payments.length === 0 ? (
        <p>
          Esta nota no tiene pagos registrados.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Método</th>
              <th>Importe</th>
              <th>Registrado por</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            {note.payments.map((payment) => (
              <tr key={payment.id}>
                <td>
                  {formatTimestamp(
                    payment.paidAt,
                  )}
                </td>
                <td>
                  {
                    PAYMENT_METHOD_LABELS[
                      payment.method
                    ]
                  }
                </td>
                <td>
                  {formatMoneyFromCents(
                    payment.amountCents,
                  )}
                </td>
                <td>
                  {memberNames[
                    payment.createdBy
                  ] ?? payment.createdBy}
                </td>
                <td>
                  {payment.active
                    ? 'Activo'
                    : 'Inactivo'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}