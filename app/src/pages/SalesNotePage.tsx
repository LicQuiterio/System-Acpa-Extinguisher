import {
  useEffect,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { SalesNoteItemsEditor } from '../components/SalesNoteItemsEditor'
import { SalesClientForm } from '../components/SalesClientForm'
import { WhatsAppClientLink } from '../components/WhatsAppClientLink'
import {
  SalesQuotationPrint,
  type SalesQuotationPrintAmounts,
} from '../components/print/SalesQuotationPrint'
import {
  SalesDocumentPrint,
} from '../components/print/SalesDocumentPrint'
import { getSalesClients } from '../services/salesClientService'
import type {
  CreateSalesNoteResult,
  PaymentInput,
  PaymentMethod,
  SalesNoteDeliveryInput,
  SalesNoteItem,
} from '../types/salesNote'
import type { SalesNoteItemDraft } from '../types/salesNoteDraft'
import {
  getSalesClientDisplayName,
  type SalesClient,
} from '../types/client'
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
import { 
  createSalesNote,
  getNextSalesNoteFolio,
 } from '../services/salesNoteService'

type PaymentDraft = {
  id: string
  amount: string
  method: PaymentMethod
}

type PrintableQuotation = {
  folioDisplay: string
  quotationDate: Date
  client: SalesClient
  items: SalesNoteItem[]
  amounts: SalesQuotationPrintAmounts
  scheduledDeliveryDate: string | null
  notes: string
  includePlannedLoanCondition: boolean
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
  const [
  includePlannedLoanCondition,
  setIncludePlannedLoanCondition,
] = useState(false)
  const [loadingClients, setLoadingClients] =
    useState(true)
  const [showClientForm, setShowClientForm] =
  useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
    const [saving, setSaving] = useState(false)
  const [createdNote, setCreatedNote] =
    useState<CreateSalesNoteResult | null>(null)
    const [
  printableQuotation,
  setPrintableQuotation,
] = useState<PrintableQuotation | null>(null)



const [
  preparingQuotation,
  setPreparingQuotation,
] = useState(false)
    const [delivery, setDelivery] =
  useState<SalesNoteDeliveryInput>({
    status: 'pending',
    scheduledDate: '',
  })

  const handleQuotationDocumentFinished =
  useCallback(
    (documentError: string | null) => {
      if (documentError) {
        setError(documentError)
      }

      setPrintableQuotation(null)
      setPreparingQuotation(false)
    },
    [],
  )

  const formLocked =
  saving ||
  preparingQuotation ||
  printableQuotation !== null ||
  createdNote !== null

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

  async function handleClientCreated(
  clientId: string,
) {
  const currentMember = member

  if (!currentMember) {
    setError('No existe una membresía activa')
    return
  }

  setShowClientForm(false)
  setLoadingClients(true)
  setError('')

  try {
    const loadedClients = await getSalesClients(
      currentMember.businessId,
    )

    const activeClients = loadedClients.filter(
      (client) => client.active,
    )

    setClients(activeClients)
    setSelectedClientId(clientId)
    setMessage(
      'Cliente registrado y seleccionado.',
    )
  } catch {
    setError(
      'El cliente fue registrado, pero no fue posible actualizar la lista.',
    )
  } finally {
    setLoadingClients(false)
  }
}


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
    setShowClientForm(false)
    setItems([])
    setPayments([])
    setApplyVat(false)
    setApplyResicoWithholding(false)
    setNotes('')
    setIncludePlannedLoanCondition(false)
    setError('')
    setMessage('')
    setCreatedNote(null)
    setPrintableQuotation(null)
    setPreparingQuotation(false)
    setDelivery({
      status: 'pending',
      scheduledDate: '',
    })
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
      notes.trim() !== '' ||
      includePlannedLoanCondition ||
      delivery.status !== 'pending' || 
      delivery.scheduledDate !== ''
      
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
          delivery,
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

  async function printTemporaryQuotation() {
  setError('')
  setMessage('')

  const currentMember = member
  const currentClient = selectedClient

  try {
    if (!currentMember) {
      throw new Error(
        'No existe una membresía activa',
      )
    }

    if (!currentClient) {
      throw new Error(
        'Selecciona un cliente registrado',
      )
    }

    const convertedItems =
      convertItemDrafts(items)

    setPreparingQuotation(true)

    const nextFolio =
      await getNextSalesNoteFolio(
        currentMember.businessId,
      )

    setPrintableQuotation({
      folioDisplay: nextFolio.folioDisplay,
      quotationDate: new Date(),
      client: currentClient,
      items: convertedItems,
      amounts: {
        subtotalCents:
          summary.subtotalCents,
        applyVat,
        vatAmountCents:
          summary.vatAmountCents,
        applyResicoWithholding,
        resicoAmountCents:
          summary.resicoAmountCents,
        totalCents: summary.totalCents,
      },
      scheduledDeliveryDate:
        delivery.scheduledDate,
      notes,
      includePlannedLoanCondition,
    })
  } catch (caughtError) {
  setError(
    caughtError instanceof Error
      ? caughtError.message
      : 'No fue posible preparar la cotización',
  )
  setPreparingQuotation(false)
}
}

  if (!member || !user) {
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
          className={
            loadingClients
              ? 'skeleton sales-client-loading'
              : undefined
          }
          aria-busy={loadingClients}
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

        <div className="sales-client-selection-actions">
          <button
            type="button"
            className="button-secondary"
            disabled={formLocked}
            onClick={() => {
              setShowClientForm(
                (currentValue) => !currentValue,
              )
              setError('')
              setMessage('')
            }}
          >
            {showClientForm
              ? 'Cerrar registro'
              : 'Registrar nuevo cliente'}
          </button>
          <Link to="/clients">
            Administrar clientes
          </Link>
        </div>
      </section>

      {showClientForm && !formLocked && (
        <SalesClientForm
          businessId={member.businessId}
          userId={user.uid}
          onCreated={handleClientCreated}
          onCancel={() => {
            setShowClientForm(false)
            setError('')
          }}
        />
      )}

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

        <label className="checkbox-control">
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

        <label className="checkbox-control">
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
        <h2>Entrega</h2>

        <label htmlFor="sales-delivery-status">
          Estado de entrega
        </label>

        <select
          id="sales-delivery-status"
          value={delivery.status}
          disabled={formLocked}
          onChange={(event) => {
            const status = event.target.value
          
            setDelivery(
              status === 'delivered'
                ? {
                    status: 'delivered',
                    scheduledDate:
                      delivery.scheduledDate || null,
                  }
                : {
                    status: 'pending',
                    scheduledDate:
                      delivery.scheduledDate ?? '',
                  },
            )
          
            setError('')
            setMessage('')
          }}
        >
          <option value="pending">
            Pendiente de entrega
          </option>
          <option value="delivered">
            Entregado
          </option>
        </select>
        
        <label htmlFor="sales-scheduled-delivery-date">
          Fecha programada de entrega
        </label>
        
        <input
          id="sales-scheduled-delivery-date"
          type="date"
          value={delivery.scheduledDate ?? ''}
          required={delivery.status === 'pending'}
          disabled={formLocked}
          onChange={(event) => {
            const scheduledDate = event.target.value
          
            setDelivery((currentDelivery) =>
              currentDelivery.status === 'pending'
                ? {
                    status: 'pending',
                    scheduledDate,
                  }
                : {
                    status: 'delivered',
                    scheduledDate:
                      scheduledDate || null,
                  },
            )
          
            setError('')
            setMessage('')
          }}
        />

        {delivery.status === 'pending' ? (
          <p>
            Esta fecha indica cuándo ACPA se compromete
            a entregar el pedido.
          </p>
        ) : (
          <p>
            Al guardar, se registrará automáticamente
            quién realizó la entrega y la fecha real.
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
        <label className="checkbox-control">
          <input
            type="checkbox"
            checked={includePlannedLoanCondition}
            disabled={formLocked}
            onChange={(event) => {
              setIncludePlannedLoanCondition(
                event.target.checked,
              )
              setError('')
              setMessage('')
            }}
          />

          Incluir condición de extintor en préstamo
          en la cotización
        </label>
          
        <p>
          Esta condición solamente aparecerá en la
          cotización temporal. No registra ni reserva
          un equipo.
        </p>
      </section>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <footer className="sales-note-actions">
        <button
          type="button"
          disabled={saving}
          className="button-secondary"
          onClick={clearForm}
        >
          {createdNote
            ? 'Crear otra nota'
            : 'Limpiar'}
        </button>

        <button
          type="button"
          disabled={formLocked}
          className="button-secondary"
          onClick={() =>
            void printTemporaryQuotation()
          }
        >
          {preparingQuotation
              ? 'Preparando cotización...'
              : 'Imprimir cotización temporal'}
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

      {selectedClient && (
        <WhatsAppClientLink
          phone={selectedClient.phone}
          message={
            `Hola ${getSalesClientDisplayName(selectedClient)}, ` +
            'te comparto la cotización de ACPA Extintores.'
          }
        />
      )}

      {printableQuotation && (
        <SalesDocumentPrint
          onFinished={
            handleQuotationDocumentFinished
          }
        >
          <SalesQuotationPrint
            {...printableQuotation}
          />
        </SalesDocumentPrint>
      )}
    </main>
  )
}