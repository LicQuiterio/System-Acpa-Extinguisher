import { useEffect, useState, type FormEvent} from 'react'
import {
  Link,
  useParams,
} from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { SalesQuotationPrint } from '../components/print/SalesQuotationPrint'
import {
  EXTINGUISHER_AGENTS,
  EXTINGUISHER_SERVICES,
} from '../constants/sales'
import {
  getSalesNoteDetail,
  registerSalesNotePayment,
  markSalesNoteDelivered,
  cancelSalesNote,
  rescheduleSalesNoteDelivery,
} from '../services/salesNoteService'
import type {
  PaymentMethod,
  SalesNoteDetail,
  SalesNoteItem,
} from '../types/salesNote'
import {
  formatCentsForInput,
  formatMoneyFromCents,
  parseMoneyToCents,
} from '../utils/money'
import { getMemberDisplayNames } from '../services/memberService'
import {
  canManageSalesNotes,
  canRescheduleSalesNoteDelivery,
} from '../types/member'

const DOCUMENT_STATUS_LABELS = {
  issued: 'Emitida',
  cancelled: 'Cancelada',
}

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Sin pago',
  partial: 'Pago parcial',
  paid: 'Pagada',
}

const PAYMENT_METHOD_LABELS: Record<
  PaymentMethod,
  string
> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
}

function waitForPrintableImage(
  image: HTMLImageElement,
): Promise<void> {
  if (image.complete) {
    return image.naturalWidth > 0
      ? Promise.resolve()
      : Promise.reject(
          new Error(
            'No fue posible cargar una imagen de la nota.',
          ),
        )
  }

  return new Promise((resolve, reject) => {
    const handleLoad = () => {
      cleanup()
      resolve()
    }

    const handleError = () => {
      cleanup()
      reject(
        new Error(
          'No fue posible cargar una imagen de la nota.',
        ),
      )
    }

    const cleanup = () => {
      image.removeEventListener(
        'load',
        handleLoad,
      )

      image.removeEventListener(
        'error',
        handleError,
      )
    }

    image.addEventListener(
      'load',
      handleLoad,
      { once: true },
    )

    image.addEventListener(
      'error',
      handleError,
      { once: true },
    )
  })
}

function waitForPrintLayout(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        resolve()
      })
    })
  })
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

function getCustomerName(
  note: SalesNoteDetail,
): string {
  return note.customerSnapshot.type === 'company'
    ? note.customerSnapshot.companyName
    : note.customerSnapshot.contactName
}

function findLabel(
  options: readonly {
    value: string
    label: string
  }[],
  value: string,
): string {
  return (
    options.find(
      (option) => option.value === value,
    )?.label ?? value
  )
}

function getItemDescription(
  item: SalesNoteItem,
): string {
  if (item.type === 'general_product') {
    return item.description
  }

  const service = findLabel(
    EXTINGUISHER_SERVICES,
    item.service,
  )

  const agent = findLabel(
    EXTINGUISHER_AGENTS,
    item.agent,
  )

  return [
    service,
    agent,
    `${item.capacityValue} ${item.capacityUnit}`,
  ].join(' · ')
}

function getRelatedUserIds(
  note: SalesNoteDetail,
): string[] {
  return [
    note.createdBy,
    note.updatedBy,
    note.delivery.deliveredBy,
    note.cancellation?.cancelledBy,
    ...note.deliveryScheduleChanges.map(
      (change) => change.changedBy,
    ),
    ...note.payments.map(
      (payment) => payment.createdBy,
    ),
  ].filter(
    (userId): userId is string =>
      Boolean(userId),
  )
}

function resolveUserName(
  userId: string | null,
  memberNames: Record<string, string>,
): string {
  if (!userId) {
    return 'No disponible'
  }

  return memberNames[userId] ?? userId
}

export function SalesNoteDetailPage() {
  const { noteId } = useParams()
  const { member, user } = useAuth()

  const [note, setNote] =
    useState<SalesNoteDetail | null>(null)
    const [memberNames, setMemberNames] = useState<
  Record<string, string>
>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
    const [printableNote, setPrintableNote] =
    useState<SalesNoteDetail | null>(null)

  const [preparingPrint, setPreparingPrint] =
    useState(false)

  const [printError, setPrintError] =
    useState('')
    const [paymentFormOpen, setPaymentFormOpen] =
    useState(false)

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('cash')

  const [paymentAmount, setPaymentAmount] =
    useState('')
    const [deliverySubmitting, setDeliverySubmitting] =
  useState(false)

const [deliveryError, setDeliveryError] =
  useState('')

const [deliveryMessage, setDeliveryMessage] =
  useState('')
  const [
  reschedulingFormOpen,
  setReschedulingFormOpen,
] = useState(false)

const [
  newScheduledDate,
  setNewScheduledDate,
] = useState('')

const [
  reschedulingReason,
  setReschedulingReason,
] = useState('')

const [
  reschedulingSubmitting,
  setReschedulingSubmitting,
] = useState(false)

const [
  reschedulingError,
  setReschedulingError,
] = useState('')

const [
  reschedulingMessage,
  setReschedulingMessage,
] = useState('')

  const [
    pendingPaymentCents,
    setPendingPaymentCents,
  ] = useState<number | null>(null)

  const [paymentSubmitting, setPaymentSubmitting] =
    useState(false)

  const [paymentError, setPaymentError] =
    useState('')

  const [paymentMessage, setPaymentMessage] =
    useState('')

    const [
  cancellationFormOpen,
  setCancellationFormOpen,
] = useState(false)

const [cancellationReason, setCancellationReason] =
  useState('')

const [
  cancellationSubmitting,
  setCancellationSubmitting,
] = useState(false)

const [cancellationError, setCancellationError] =
  useState('')

const [cancellationMessage, setCancellationMessage] =
  useState('')

  useEffect(() => {
    
    if (!member || !noteId) {
      return
    }

    let cancelled = false

    getSalesNoteDetail(
      member.businessId,
      noteId,
    )
      .then(async (loadedNote) => {
          if (cancelled) {
            return
          }
      
          if (!loadedNote) {
            setError('La nota no existe.')
            return
          }
      
          const loadedMemberNames =
            await getMemberDisplayNames(
              member.businessId,
              getRelatedUserIds(loadedNote),
            )
        
          if (cancelled) {
            return
          }
      
          setNote(loadedNote)
          setMemberNames(loadedMemberNames)
        })
      .catch(() => {
        if (!cancelled) {
          setError(
            'No fue posible cargar la nota.',
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
  }, [member, noteId])

    useEffect(() => {
    if (!printableNote) {
      return
    }

    let cancelled = false

    async function openPrintDialog() {
      try {
        const printableImages = Array.from(
          document.querySelectorAll<HTMLImageElement>(
            '.quotation-print-area img',
          ),
        )

        await Promise.all(
          printableImages.map(
            waitForPrintableImage,
          ),
        )

        await waitForPrintLayout()

        if (cancelled) {
          return
        }

        window.print()
      } catch (caughtError) {
        if (!cancelled) {
          setPrintError(
            caughtError instanceof Error
              ? caughtError.message
              : 'No fue posible preparar la nota.',
          )
        }
      } finally {
        if (!cancelled) {
          setPrintableNote(null)
          setPreparingPrint(false)
        }
      }
    }

    void openPrintDialog()

    return () => {
      cancelled = true
    }
  }, [printableNote])

      function handlePrintNote() {
    if (!note || preparingPrint) {
      return
    }

    setPrintError('')
    setPreparingPrint(true)
    setPrintableNote(note)
  }

    function closePaymentForm() {
    setPaymentFormOpen(false)
    setPaymentAmount('')
    setPaymentMethod('cash')
    setPendingPaymentCents(null)
    setPaymentError('')
  }

  function handlePaymentReview(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setPaymentError('')
    setPaymentMessage('')

    if (!note) {
      return
    }

    try {
      const amountCents =
        parseMoneyToCents(paymentAmount)

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

      setPendingPaymentCents(amountCents)
    } catch (caughtError) {
      setPaymentError(
        caughtError instanceof Error
          ? caughtError.message
          : 'El importe no es válido.',
      )
    }
  }

  async function handleConfirmPayment() {
    if (
      !member ||
      !user ||
      !noteId ||
      !pendingPaymentCents
    ) {
      return
    }

    setPaymentSubmitting(true)
    setPaymentError('')
    setPaymentMessage('')

    try {
      await registerSalesNotePayment(
        member.businessId,
        noteId,
        user.uid,
        {
          amountCents: pendingPaymentCents,
          method: paymentMethod,
        },
      )

      const updatedNote =
        await getSalesNoteDetail(
          member.businessId,
          noteId,
        )

      if (!updatedNote) {
        throw new Error(
          'La nota ya no está disponible.',
        )
      }

      const updatedMemberNames =
        await getMemberDisplayNames(
          member.businessId,
          getRelatedUserIds(updatedNote),
        )

      setNote(updatedNote)
      setMemberNames(updatedMemberNames)
      closePaymentForm()

      setPaymentMessage(
        'Pago registrado correctamente.',
      )
    } catch (caughtError) {
      setPendingPaymentCents(null)

      setPaymentError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No fue posible registrar el pago.',
      )
    } finally {
      setPaymentSubmitting(false)
    }
  }

  async function handleRescheduleDelivery(
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault()

  if (!member || !user || !noteId || !note) {
    return
  }

  setReschedulingSubmitting(true)
  setReschedulingError('')
  setReschedulingMessage('')

  try {
    await rescheduleSalesNoteDelivery(
      member.businessId,
      noteId,
      user.uid,
      newScheduledDate,
      reschedulingReason,
    )

    const updatedNote =
      await getSalesNoteDetail(
        member.businessId,
        noteId,
      )

    if (!updatedNote) {
      throw new Error(
        'La nota ya no está disponible.',
      )
    }

    const updatedMemberNames =
      await getMemberDisplayNames(
        member.businessId,
        getRelatedUserIds(updatedNote),
      )

    setNote(updatedNote)
    setMemberNames(updatedMemberNames)
    setReschedulingFormOpen(false)
    setNewScheduledDate('')
    setReschedulingReason('')
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
    setReschedulingSubmitting(false)
  }
}

  async function handleMarkDelivered() {
  if (!member || !user || !noteId || !note) {
    return
  }

  const confirmed = window.confirm(
    `¿Confirmas que la nota ${note.folioDisplay} ya fue entregada? Esta acción no se puede revertir.`,
  )

  if (!confirmed) {
    return
  }

  setDeliverySubmitting(true)
  setDeliveryError('')
  setDeliveryMessage('')

  try {
    await markSalesNoteDelivered(
      member.businessId,
      noteId,
      user.uid,
    )

    const updatedNote =
      await getSalesNoteDetail(
        member.businessId,
        noteId,
      )

    if (!updatedNote) {
      throw new Error(
        'La nota ya no está disponible.',
      )
    }

    const updatedMemberNames =
      await getMemberDisplayNames(
        member.businessId,
        getRelatedUserIds(updatedNote),
      )

    setNote(updatedNote)
    setMemberNames(updatedMemberNames)
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
    setDeliverySubmitting(false)
  }
}
async function handleCancelSalesNote(
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault()

  if (!member || !user || !noteId || !note) {
    return
  }

  const reason = cancellationReason.trim()

  if (reason.length < 10) {
    setCancellationError(
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

  setCancellationSubmitting(true)
  setCancellationError('')
  setCancellationMessage('')

  try {
    await cancelSalesNote(
      member.businessId,
      noteId,
      user.uid,
      reason,
    )

    const updatedNote =
      await getSalesNoteDetail(
        member.businessId,
        noteId,
      )

    if (!updatedNote) {
      throw new Error(
        'La nota ya no está disponible.',
      )
    }

    const updatedMemberNames =
      await getMemberDisplayNames(
        member.businessId,
        getRelatedUserIds(updatedNote),
      )

    setNote(updatedNote)
    setMemberNames(updatedMemberNames)
    setCancellationFormOpen(false)
    setCancellationReason('')
    setCancellationMessage(
      'Nota cancelada correctamente.',
    )
  } catch (caughtError) {
    setCancellationError(
      caughtError instanceof Error
        ? caughtError.message
        : 'No fue posible cancelar la nota.',
    )
  } finally {
    setCancellationSubmitting(false)
  }
}


  if (!member) {
    return (
      <main>
        <p>No tienes una membresía activa.</p>
      </main>
    )
  }

  if (!noteId) {
    return (
      <main>
        <p>
          <Link to="/sales">
            ← Volver al historial
          </Link>
        </p>

        <p role="alert">
          No se proporcionó una nota válida.
        </p>
      </main>
    )
  }

  return (
    <main>
      <p>
        <Link to="/sales">
          ← Volver al historial
        </Link>
      </p>

      {loading && <p>Cargando nota...</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && note && (
        <>
          <header>
            <h1>
              Nota de venta {note.folioDisplay}
            </h1>

            <p>
              Emitida el{' '}
              {formatTimestamp(note.issuedAt)}
            </p>

            <p>
  <button
    type="button"
    disabled={preparingPrint}
    onClick={handlePrintNote}
  >
    {preparingPrint
      ? 'Preparando impresión...'
      : note.documentStatus === 'cancelled'
        ? 'Reimprimir nota cancelada'
        : 'Imprimir nota'}
  </button>
</p>

{printError && (
  <p role="alert">{printError}</p>
)}
          </header>

          <section>
            <h2>Estado de la nota</h2>

            <dl>
              <dt>Documento</dt>
              <dd>
                {
                  DOCUMENT_STATUS_LABELS[
                    note.documentStatus
                  ]
                }
              </dd>

              <dt>Pago</dt>
              <dd>
                {
                  PAYMENT_STATUS_LABELS[
                    note.paymentStatus
                  ]
                }
              </dd>

              <dt>Tipo de folio</dt>
              <dd>
                {note.folioMode === 'manual'
                  ? 'Manual'
                  : 'Automático'}
              </dd>

              {note.manualFolioReason && (
                <>
                  <dt>Motivo del folio manual</dt>
                  <dd>
                    {note.manualFolioReason}
                  </dd>
                </>
              )}
            </dl>
            {cancellationMessage && (
  <p role="status">{cancellationMessage}</p>
)}

{cancellationError && (
  <p role="alert">{cancellationError}</p>
)}

{member.role === 'owner' &&
  note.documentStatus === 'issued' &&
  note.amounts.paidCents === 0 &&
  note.delivery.status === 'pending' &&
  !cancellationFormOpen && (
    <p>
      <button
        type="button"
        onClick={() => {
          setCancellationFormOpen(true)
          setCancellationError('')
          setCancellationMessage('')
        }}
      >
        Cancelar nota
      </button>
    </p>
  )}

{member.role === 'owner' &&
  note.documentStatus === 'issued' &&
  note.amounts.paidCents > 0 && (
    <p>
      Esta nota tiene pagos registrados y no puede
      cancelarse.
    </p>
  )}

{member.role === 'owner' &&
  note.documentStatus === 'issued' &&
  note.delivery.status === 'delivered' && (
    <p>
      Esta nota ya fue entregada y no puede
      cancelarse.
    </p>
  )}

        {cancellationFormOpen && (
          <form onSubmit={handleCancelSalesNote}>
            <fieldset disabled={cancellationSubmitting}>
              <legend>Cancelar nota</legend>
        
              <p>
                La cancelación conservará el folio y todos
                los datos de la nota.
              </p>
        
              <p>
                <label>
                  Motivo de cancelación
                  <textarea
                    required
                    minLength={10}
                    maxLength={500}
                    rows={4}
                    value={cancellationReason}
                    onChange={(event) =>
                      setCancellationReason(
                        event.target.value,
                      )
                    }
                  />
                </label>
              </p>
                
              <p>
                <button type="submit">
                  {cancellationSubmitting
                    ? 'Cancelando...'
                    : 'Confirmar cancelación'}
                </button>{' '}
                <button
                  type="button"
                  disabled={cancellationSubmitting}
                  onClick={() => {
                    setCancellationFormOpen(false)
                    setCancellationReason('')
                    setCancellationError('')
                  }}
                >
                  Cerrar
                </button>
              </p>
            </fieldset>
          </form>
        )}
          </section>

          <section>
            <h2>Cliente</h2>

            <h3>{getCustomerName(note)}</h3>

            <dl>
              {note.customerSnapshot.type ===
                'company' && (
                <>
                  <dt>Empresa</dt>
                  <dd>
                    {
                      note.customerSnapshot
                        .companyName
                    }
                  </dd>
                </>
              )}

              <dt>Contacto</dt>
              <dd>
                {note.customerSnapshot.contactName ||
                  'No registrado'}
              </dd>

              <dt>Teléfono</dt>
              <dd>
                {note.customerSnapshot.phone ||
                  'No registrado'}
              </dd>

              <dt>Correo</dt>
              <dd>
                {note.customerSnapshot.email ||
                  'No registrado'}
              </dd>

              <dt>Dirección</dt>
              <dd>
                {note.customerSnapshot.address ||
                  'No registrada'}
              </dd>

              <dt>Municipio o comunidad</dt>
              <dd>
                {
                  note.customerSnapshot
                    .serviceAreaDisplayName
                }
              </dd>
            </dl>

            <p>
              <Link
                to={`/clients/${note.clientId}`}
              >
                Consultar cliente
              </Link>
            </p>
          </section>

          <section>
            <h2>Conceptos vendidos</h2>

            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Importe</th>
                  <th>Observaciones</th>
                </tr>
              </thead>

              <tbody>
                {note.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {getItemDescription(item)}
                    </td>

                    <td>{item.quantity}</td>

                    <td>
                      {formatMoneyFromCents(
                        item.unitPriceCents,
                      )}
                    </td>

                    <td>
                      {formatMoneyFromCents(
                        item.lineSubtotalCents,
                      )}
                    </td>

                    <td>
                      {item.notes ||
                        'Sin observaciones'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>Resumen financiero</h2>

            <dl>
              <dt>Subtotal</dt>
              <dd>
                {formatMoneyFromCents(
                  note.amounts.subtotalCents,
                )}
              </dd>

              <dt>
                IVA (
                {note.amounts
                  .vatRateBasisPoints / 100}
                %)
              </dt>
              <dd>
                {note.amounts.applyVat
                  ? formatMoneyFromCents(
                      note.amounts
                        .vatAmountCents,
                    )
                  : 'No aplicado'}
              </dd>

              <dt>
                Retención ISR RESICO (
                {note.amounts
                  .resicoRateBasisPoints / 100}
                %)
              </dt>
              <dd>
                {note.amounts
                  .applyResicoWithholding
                  ? `−${formatMoneyFromCents(
                      note.amounts
                        .resicoAmountCents,
                    )}`
                  : 'No aplicada'}
              </dd>

              <dt>Total</dt>
              <dd>
                <strong>
                  {formatMoneyFromCents(
                    note.amounts.totalCents,
                  )}
                </strong>
              </dd>

              <dt>Pagado</dt>
              <dd>
                {formatMoneyFromCents(
                  note.amounts.paidCents,
                )}
              </dd>

              <dt>Saldo pendiente</dt>
              <dd>
                <strong>
                  {formatMoneyFromCents(
                    note.amounts.balanceCents,
                  )}
                </strong>
              </dd>
            </dl>
          </section>

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

            {paymentMessage && (
              <p role="status">
                {paymentMessage}
              </p>
            )}

            {paymentError && (
              <p role="alert">
                {paymentError}
              </p>
            )}

            {note.documentStatus ===
              'cancelled' && (
              <p>
                No se pueden registrar pagos en una
                nota cancelada.
              </p>
            )}

            {note.documentStatus === 'issued' &&
              note.amounts.balanceCents === 0 && (
                <p>
                  Esta nota está completamente pagada.
                </p>
              )}

            {user &&
              canManageSalesNotes(member.role) &&
              note.documentStatus === 'issued' &&
              note.amounts.balanceCents > 0 &&
              !paymentFormOpen && (
                <p>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentFormOpen(true)
                      setPaymentError('')
                      setPaymentMessage('')
                    }}
                  >
                    Registrar pago
                  </button>
                </p>
              )}

            {paymentFormOpen &&
              pendingPaymentCents === null && (
                <form
                  onSubmit={handlePaymentReview}
                >
                  <fieldset
                    disabled={paymentSubmitting}
                  >
                    <legend>Nuevo pago</legend>

                    <p>
                      <label>
                        Método de pago
                        <select
                          value={paymentMethod}
                          onChange={(event) =>
                            setPaymentMethod(
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
                            note.amounts
                              .balanceCents / 100
                          }
                          step="0.01"
                          value={paymentAmount}
                          onChange={(event) =>
                            setPaymentAmount(
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
                          setPaymentAmount(
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
                        onClick={closePaymentForm}
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

            {paymentFormOpen &&
              pendingPaymentCents !== null && (
                <div>
                  <h3>Confirmar pago</h3>

                  <dl>
                    <dt>Método</dt>
                    <dd>
                      {
                        PAYMENT_METHOD_LABELS[
                          paymentMethod
                        ]
                      }
                    </dd>

                    <dt>Importe</dt>
                    <dd>
                      <strong>
                        {formatMoneyFromCents(
                          pendingPaymentCents,
                        )}
                      </strong>
                    </dd>

                    <dt>Saldo después del pago</dt>
                    <dd>
                      {formatMoneyFromCents(
                        note.amounts.balanceCents -
                          pendingPaymentCents,
                      )}
                    </dd>
                  </dl>

                  <p>
                    <button
                      type="button"
                      disabled={paymentSubmitting}
                      onClick={() =>
                        setPendingPaymentCents(null)
                      }
                    >
                      Regresar
                    </button>{' '}

                    <button
                      type="button"
                      disabled={paymentSubmitting}
                      onClick={handleConfirmPayment}
                    >
                      {paymentSubmitting
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
                        {resolveUserName(
                          payment.createdBy,
                          memberNames,
                        )}
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

          <section>
            <h2>Entrega</h2>

            <dl>
              <dt>Estado</dt>
              <dd>
                {note.delivery.status ===
                'delivered'
                  ? 'Entregada'
                  : 'Pendiente de entrega'}
              </dd>

              <dt>Fecha programada</dt>
              <dd>
                {formatScheduledDate(
                  note.delivery.scheduledDate,
                )}
              </dd>

              {note.delivery.status ===
                'delivered' && (
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
                   {resolveUserName(
                      note.delivery.deliveredBy,
                      memberNames,
                    )}
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
              <p role="alert">
                {reschedulingError}
              </p>
            )}

            {user &&
              canRescheduleSalesNoteDelivery(
                member.role,
              ) &&
              note.documentStatus === 'issued' &&
              note.delivery.status === 'pending' &&
              !reschedulingFormOpen && (
                <p>
                  <button
                    type="button"
                    onClick={() => {
                      setReschedulingFormOpen(true)
                      setNewScheduledDate('')
                      setReschedulingReason('')
                      setReschedulingError('')
                      setReschedulingMessage('')
                    }}
                  >
                    Reprogramar entrega
                  </button>
                </p>
              )}

            {reschedulingFormOpen && (
              <form onSubmit={handleRescheduleDelivery}>
                <fieldset disabled={reschedulingSubmitting}>
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
                        value={newScheduledDate}
                        onChange={(event) =>
                          setNewScheduledDate(
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
                        value={reschedulingReason}
                        onChange={(event) =>
                          setReschedulingReason(
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  </p>
                      
                  <p>
                    <button type="submit">
                      {reschedulingSubmitting
                        ? 'Guardando...'
                        : 'Confirmar nueva fecha'}
                    </button>{' '}
                      
                    <button
                      type="button"
                      onClick={() => {
                        setReschedulingFormOpen(false)
                        setNewScheduledDate('')
                        setReschedulingReason('')
                        setReschedulingError('')
                      }}
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

            {user &&
              canManageSalesNotes(member.role) &&
              note.documentStatus === 'issued' &&
              note.delivery.status === 'pending' && (
                <p>
                  <button
                    type="button"
                    disabled={deliverySubmitting}
                    onClick={handleMarkDelivered}
                  >
                    {deliverySubmitting
                      ? 'Registrando entrega...'
                      : 'Marcar como entregada'}
                  </button>
                </p>
              )}

            {note.documentStatus === 'cancelled' &&
              note.delivery.status === 'pending' && (
                <p>
                  No se puede registrar la entrega de una nota
                  cancelada.
                </p>
              )}

            {note.delivery.isLegacy && (
              <p>
                Esta nota utiliza el formato anterior
                de entrega; algunos datos pueden no
                estar disponibles.
              </p>
            )}

            {note.deliveryScheduleChanges.length > 0 && (
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
              {formatTimestamp(change.changedAt)}
              {' · '}
              {resolveUserName(
                change.changedBy,
                memberNames,
              )}
            </p>
          </li>
        ),
      )}
    </ol>
  </>
)}
          </section>

          <section>
            <h2>Condiciones comerciales</h2>

            <dl>
              <dt>Tiempo de entrega</dt>
              <dd>{note.terms.deliveryTime}</dd>

              <dt>Garantía</dt>
              <dd>{note.terms.warranty}</dd>

              <dt>Condición adicional</dt>
              <dd>
                {note.terms.additionalCondition ||
                  'Sin condición adicional'}
              </dd>
            </dl>

            <h3>Cláusulas</h3>

            {note.terms.clauses.length > 0 ? (
              <ul>
                {note.terms.clauses.map(
                  (clause, index) => (
                    <li key={`${index}-${clause}`}>
                      {clause}
                    </li>
                  ),
                )}
              </ul>
            ) : (
              <p>Sin cláusulas registradas.</p>
            )}
          </section>

          <section>
            <h2>Observaciones</h2>

            <p>
              {note.notes ||
                'Sin observaciones adicionales.'}
            </p>
          </section>

          {note.documentStatus ===
            'cancelled' && (
            <section>
              <h2>Cancelación</h2>

              {note.cancellation ? (
                <dl>
                  <dt>Motivo</dt>
                  <dd>
                    {note.cancellation.reason}
                  </dd>

                  <dt>Fecha</dt>
                  <dd>
                    {formatTimestamp(
                      note.cancellation
                        .cancelledAt,
                    )}
                  </dd>

                  <dt>Cancelada por</dt>
                  <dd>
                    {
                      resolveUserName(note.cancellation.cancelledBy, memberNames)
                    }
                  </dd>
                </dl>
              ) : (
                <p>
                  No hay información de auditoría
                  disponible.
                </p>
              )}
            </section>
          )}

          <section>
            <h2>Auditoría</h2>

            <dl>
              <dt>Creada por</dt>
              <dd>{resolveUserName(note.createdBy,memberNames)}</dd>

              <dt>Última actualización</dt>
              <dd>
                {formatTimestamp(note.updatedAt)}
              </dd>

              <dt>Actualizada por</dt>
              <dd>{resolveUserName(note.updatedBy,memberNames)}</dd>
            </dl>
          </section>
               </>
      )}

      {printableNote && (
        <SalesQuotationPrint
          folioDisplay={
            printableNote.folioDisplay
          }
          quotationDate={
            printableNote.issuedAt.toDate()
          }
          client={
            printableNote.customerSnapshot
          }
          items={printableNote.items}
          amounts={printableNote.amounts}
          scheduledDeliveryDate={
            printableNote.delivery.scheduledDate
          }
          notes={printableNote.notes}
          terms={printableNote.terms}
          registeredNote={{
            documentStatus:
              printableNote.documentStatus,
            paymentStatus:
              printableNote.paymentStatus,
            paidCents:
              printableNote.amounts.paidCents,
            balanceCents:
              printableNote.amounts.balanceCents,
            payments:
              printableNote.payments.filter(
                (payment) => payment.active,
              ),
            delivery:
              printableNote.delivery,
            cancellation:
              printableNote.cancellation,
          }}
        />
      )}
    </main>
  )
}