import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { SalesNoteItemsEditor } from '../components/SalesNoteItemsEditor'
import { getSalesClients } from '../services/salesClientService'
import type {
  CreateSalesNoteResult,
  PaymentInput,
  PaymentMethod,
} from '../types/salesNote'
import type { SalesNoteItemDraft } from '../types/salesNoteDraft'
import type { SalesClient } from '../types/client'
import {
  formatMoneyFromCents,
  parseMoneyToCents,
} from '../utils/money'
import {
  calculatePaymentSummary,
  calculateResicoWithholding,
  calculateTotal,
  calculateVat,
} from '../utils/salesCalculations'
import {
  convertItemDraft,
  convertItemDrafts,
} from '../utils/salesNoteDraft'
import { DEFAULT_SALES_TERMS } from '../constants/salesSettings'
import { createSalesNote } from '../services/salesNoteService'

type PaymentDraft = {
  id: string
  amount: string
  method: PaymentMethod
}

function createPaymentDraft(): PaymentDraft {
  return {
    id: crypto.randomUUID(),
    amount: '',
    method: 'cash',
  }
}

const PAYMENT_METHOD_LABELS: Record<
  PaymentMethod,
  string
> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
}

export function SalesNotePage() {
  const { member, user } = useAuth()

  const [clients, setClients] =
    useState<SalesClient[]>([])
  const [selectedClientId, setSelectedClientId] =
    useState('')
  const [items, setItems] =
    useState<SalesNoteItemDraft[]>([])
  const [payments, setPayments] =
    useState<PaymentDraft[]>([])
  const [applyVat, setApplyVat] = useState(false)
  const [
    applyResicoWithholding,
    setApplyResicoWithholding,
  ] = useState(false)
  const [notes, setNotes] = useState('')
  const [loadingClients, setLoadingClients] =
    useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
    const [saving, setSaving] = useState(false)
  const [createdNote, setCreatedNote] =
    useState<CreateSalesNoteResult | null>(null)

  const formLocked =
    saving || createdNote !== null

  useEffect(() => {
    if (!member) return

    let cancelled = false

    getSalesClients(member.businessId)
      .then((loadedClients) => {
        if (!cancelled) {
          setClients(
            loadedClients.filter(
              (client) => client.active,
            ),
          )
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
          setLoadingClients(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [member])

  const selectedClient = useMemo(
    () =>
      clients.find(
        (client) =>
          client.id === selectedClientId,
      ) ?? null,
    [clients, selectedClientId],
  )

  const summary = useMemo(() => {
    const subtotalCents = items.reduce(
      (accumulatedCents, item) => {
        try {
          return (
            accumulatedCents +
            convertItemDraft(item)
              .lineSubtotalCents
          )
        } catch {
          return accumulatedCents
        }
      },
      0,
    )

    const vatAmountCents = calculateVat(
      subtotalCents,
      applyVat,
    )

    const resicoAmountCents =
      calculateResicoWithholding(
        subtotalCents,
        applyResicoWithholding,
      )

    const totalCents = calculateTotal({
      subtotalCents,
      vatAmountCents,
      resicoAmountCents,
    })

    const paidCents = payments.reduce(
      (accumulatedCents, payment) => {
        try {
          return (
            accumulatedCents +
            parseMoneyToCents(payment.amount)
          )
        } catch {
          return accumulatedCents
        }
      },
      0,
    )

    return {
      subtotalCents,
      vatAmountCents,
      resicoAmountCents,
      totalCents,
      paidCents,
      balanceCents: Math.max(
        totalCents - paidCents,
        0,
      ),
      hasOverpayment: paidCents > totalCents,
    }
  }, [
    items,
    payments,
    applyVat,
    applyResicoWithholding,
  ])

  function updatePayment(
    id: string,
    patch: Partial<PaymentDraft>,
  ) {
    setPayments((currentPayments) =>
      currentPayments.map((payment) =>
        payment.id === id
          ? { ...payment, ...patch }
          : payment,
      ),
    )
    setError('')
    setMessage('')
  }

    function resetForm() {
    setSelectedClientId('')
    setItems([])
    setPayments([])
    setApplyVat(false)
    setApplyResicoWithholding(false)
    setNotes('')
    setError('')
    setMessage('')
    setCreatedNote(null)
  }

  function clearForm() {
    if (createdNote) {
      resetForm()
      return
    }

    const hasInformation =
      selectedClientId !== '' ||
      items.length > 0 ||
      payments.length > 0 ||
      applyVat ||
      applyResicoWithholding ||
      notes.trim() !== ''

    if (
      hasInformation &&
      !window.confirm(
        '¿Deseas limpiar toda la nota?',
      )
    ) {
      return
    }

    resetForm()
  }

    async function registerNote() {
  setError('')
  setMessage('')

  const currentMember = member
  const currentUser = user

  try {
    if (!currentMember || !currentUser) {
      throw new Error(
        'No existe una sesión activa',
      )
    }

      if (!selectedClient) {
        throw new Error(
          'Selecciona un cliente registrado',
        )
      }

      const convertedItems =
        convertItemDrafts(items)

      const paymentInputs: PaymentInput[] =
        payments.map((payment) => ({
          amountCents: parseMoneyToCents(
            payment.amount,
          ),
          method: payment.method,
        }))

      calculatePaymentSummary(
        summary.totalCents,
        paymentInputs,
      )

      setSaving(true)

      const result = await createSalesNote(
        currentMember.businessId,
        currentUser.uid,
        {
          clientId: selectedClient.id,
          items: convertedItems,
          applyVat,
          applyResicoWithholding,
          payments: paymentInputs,
          terms: {
            ...DEFAULT_SALES_TERMS,
            clauses: [
              ...DEFAULT_SALES_TERMS.clauses,
            ],
          },
          notes,
        },
      )

      setCreatedNote(result)
      setMessage(
        `Nota ${result.folioDisplay} registrada correctamente.`,
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No fue posible registrar la nota',
      )
    } finally {
      setSaving(false)
    }
  }

  function printTemporaryQuotation() {
    setError('')
    setMessage('')

    try {
      convertItemDrafts(items)
      window.print()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Revisa los conceptos',
      )
    }
  }

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
        <h1>Nueva nota o cotización</h1>
       <p>
          Folio:{' '}
          {createdNote
            ? createdNote.folioDisplay
            : 'se asignará al guardar'}
        </p>
        
        <button
          type="button"
          onClick={clearForm}
        >
          Limpiar formulario
        </button>
      </header>

      <section>
        <h2>Cliente</h2>

        <label htmlFor="sales-client">
          Cliente registrado
        </label>
        <select
          id="sales-client"
          value={selectedClientId}
          disabled={loadingClients || formLocked}
          onChange={(event) => {
            setSelectedClientId(
              event.target.value,
            )
            setError('')
            setMessage('')
          }}
        >
          <option value="">
            Selecciona un cliente
          </option>

          {clients.map((client) => (
            <option
              key={client.id}
              value={client.id}
            >
              {client.type === 'company'
                ? client.companyName
                : client.contactName}
              {' — '}
              {
                client.serviceAreaSnapshot
                  .displayName
              }
            </option>
          ))}
        </select>

        <p>
          <Link to="/clients">
            Crear o administrar clientes
          </Link>
        </p>
      </section>

      <SalesNoteItemsEditor
        items={items}
        disabled={formLocked}
        onChange={(updatedItems) => {
          setItems(updatedItems)
          setError('')
          setMessage('')
        }}
      />

      <section>
        <h2>Resumen financiero</h2>

        <p>
          Subtotal:{' '}
          <strong>
            {formatMoneyFromCents(
              summary.subtotalCents,
            )}
          </strong>
        </p>

        <label>
          <input
            type="checkbox"
            checked={applyVat}
            disabled={formLocked}
            onChange={(event) =>
              setApplyVat(event.target.checked)
            }
          />
          Agregar IVA 16%
        </label>

        <p>
          IVA:{' '}
          {formatMoneyFromCents(
            summary.vatAmountCents,
          )}
        </p>

        <label>
          <input
            type="checkbox"
            checked={applyResicoWithholding}
            disabled={formLocked}
            onChange={(event) =>
              setApplyResicoWithholding(
                event.target.checked,
              )
            }
          />
          Retener ISR RESICO 1.25%
        </label>

        <p>
          Retención ISR:{' '}
          {formatMoneyFromCents(
            summary.resicoAmountCents,
          )}
        </p>

        <p>
          Total:{' '}
          <strong>
            {formatMoneyFromCents(
              summary.totalCents,
            )}
          </strong>
        </p>

        <h3>Pagos</h3>

        {payments.length === 0 && (
          <p>No hay pagos registrados.</p>
        )}

        {payments.map((payment, index) => (
          <fieldset key={payment.id} disabled={formLocked}>
            <legend>Pago {index + 1}</legend>

            <label>
              Importe
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={payment.amount}
                onChange={(event) =>
                  updatePayment(payment.id, {
                    amount:
                      event.target.value,
                  })
                }
              />
            </label>

            <label>
              Método
              <select
                value={payment.method}
                onChange={(event) =>
                  updatePayment(payment.id, {
                    method:
                      event.target
                        .value as PaymentMethod,
                  })
                }
              >
                {Object.entries(
                  PAYMENT_METHOD_LABELS,
                ).map(([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() =>
                setPayments(
                  payments.filter(
                    (item) =>
                      item.id !== payment.id,
                  ),
                )
              }
            >
              Eliminar pago
            </button>
          </fieldset>
        ))}

        <button
          type="button"
          disabled={formLocked}
          onClick={() =>
            setPayments([
              ...payments,
              createPaymentDraft(),
            ])
          }
        >
          + Agregar pago
        </button>

        <p>
          Pagado:{' '}
          {formatMoneyFromCents(
            summary.paidCents,
          )}
        </p>

        <p>
          Saldo pendiente:{' '}
          <strong>
            {formatMoneyFromCents(
              summary.balanceCents,
            )}
          </strong>
        </p>

        {summary.hasOverpayment && (
          <p role="alert">
            Los pagos superan el total de la nota.
          </p>
        )}
      </section>

      <section>
        <h2>Observaciones</h2>
        <textarea
          value={notes}
          disabled={formLocked}
          onChange={(event) =>
            setNotes(event.target.value)
          }
        />
      </section>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <footer>
        <button
          type="button"
          disabled={saving}
          onClick={clearForm}
        >
          {createdNote
            ? 'Crear otra nota'
            : 'Limpiar'}
        </button>

        <button
          type="button"
          disabled={formLocked}
          onClick={printTemporaryQuotation}
        >
          Imprimir cotización temporal
        </button>

        <button
          type="button"
          disabled={formLocked}
          onClick={() => void registerNote()}
        >
          {saving
            ? 'Registrando...'
            : createdNote
              ? `Nota ${createdNote.folioDisplay} registrada`
              : 'Registrar nota'}
        </button>
      </footer>
    </main>
  )
}