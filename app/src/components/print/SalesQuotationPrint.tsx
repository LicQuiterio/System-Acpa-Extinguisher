import {
  EXTINGUISHER_AGENTS,
  EXTINGUISHER_SERVICES,
} from '../../constants/sales'
import {
  DEFAULT_SALES_TERMS,
  QUOTATION_VALIDITY,
} from '../../constants/salesSettings'
import { ACPA_QUOTATION_SETTINGS } from '../../constants/quotationSettings'
import type { SalesClient } from '../../types/client'
import type {
  CustomerSnapshot,
  DocumentStatus,
  Payment,
  PaymentStatus,
  SalesNoteCancellation,
  SalesNoteHistoryDelivery,
  SalesNoteItem,
  SalesNoteTerms,
} from '../../types/salesNote'
import { formatAmountInWords } from '../../utils/amountInWords'
import { formatMoneyFromCents } from '../../utils/money'
import '../../styles/print/SalesQuotationPrint.css'

export type SalesQuotationPrintAmounts = {
  subtotalCents: number
  applyVat: boolean
  vatAmountCents: number
  applyResicoWithholding: boolean
  resicoAmountCents: number
  totalCents: number
}

export type RegisteredSalesNotePrintData = {
  documentStatus: DocumentStatus
  paymentStatus: PaymentStatus
  paidCents: number
  balanceCents: number
  payments: Payment[]
  delivery: SalesNoteHistoryDelivery
  cancellation: SalesNoteCancellation | null
}

type SalesQuotationPrintProps = {
  folioDisplay: string
  quotationDate: Date
  client: SalesClient | CustomerSnapshot
  items: SalesNoteItem[]
  amounts: SalesQuotationPrintAmounts
  scheduledDeliveryDate: string | null
  notes: string
  terms?: SalesNoteTerms
  registeredNote?: RegisteredSalesNotePrintData
}

const DATE_FORMATTER = new Intl.DateTimeFormat(
  'es-MX',
  {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  },
)

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(
  'es-MX',
  {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
)

const DOCUMENT_STATUS_LABELS: Record<
  DocumentStatus,
  string
> = {
  issued: 'Emitida',
  cancelled: 'Cancelada',
}

const PAYMENT_STATUS_LABELS: Record<
  PaymentStatus,
  string
> = {
  unpaid: 'Sin pago',
  partial: 'Pago parcial',
  paid: 'Pagada',
}

const PAYMENT_METHOD_LABELS: Record<
  Payment['method'],
  string
> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
}

function getOptionLabel(
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

function getClientName(
  client: SalesClient | CustomerSnapshot,
): string {
  return client.type === 'company'
    ? client.companyName
    : client.contactName
}

function getClientServiceArea(
  client: SalesClient | CustomerSnapshot,
): string {
  if ('serviceAreaSnapshot' in client) {
    return client.serviceAreaSnapshot.displayName
  }

  return client.serviceAreaDisplayName
}

function getItemDescription(
  item: SalesNoteItem,
): string {
  if (item.type === 'general_product') {
    return item.description
  }

  return getOptionLabel(
    EXTINGUISHER_SERVICES,
    item.service,
  )
}

function getItemCharacteristics(
  item: SalesNoteItem,
): string {
  if (item.type === 'general_product') {
    return item.notes || 'Producto general'
  }

  const agent = getOptionLabel(
    EXTINGUISHER_AGENTS,
    item.agent,
  )

  const characteristics = [
    agent,
    `${item.capacityValue} ${item.capacityUnit}`,
  ]

  if (item.notes) {
    characteristics.push(item.notes)
  }

  return characteristics.join(' · ')
}

function formatScheduledDate(
  value: string | null,
): string | null {
  if (!value) {
    return null
  }

  const [year, month, day] = value
    .split('-')
    .map(Number)

  if (!year || !month || !day) {
    return value
  }

  return DATE_FORMATTER.format(
    new Date(year, month - 1, day),
  )
}

export function SalesQuotationPrint({
  folioDisplay,
  quotationDate,
  client,
  items,
  amounts,
  scheduledDeliveryDate,
  notes,
  registeredNote,
  terms = DEFAULT_SALES_TERMS,
}: SalesQuotationPrintProps) {
  const settings = ACPA_QUOTATION_SETTINGS

  const formattedDeliveryDate =
    formatScheduledDate(scheduledDeliveryDate)

  const documentTitle = registeredNote
    ? 'Nota de venta'
    : 'Cotización'

  const isCancelled =
    registeredNote?.documentStatus === 'cancelled'

  const deliveredAt =
    registeredNote?.delivery.deliveredAt
      ? DATE_TIME_FORMATTER.format(
          registeredNote.delivery.deliveredAt.toDate(),
        )
      : null

  return (
    <article
      className="quotation-print-area"
      aria-label={`${documentTitle} ${folioDisplay}`}
    >
      <div className="quotation-sheet">
        {isCancelled && (
          <div
            className="quotation-cancelled-watermark"
            aria-hidden="true"
          >
            CANCELADA
          </div>
        )}
                <header className="quotation-header">
          <div className="quotation-brand">
            <img
              src={settings.logoPath}
              alt="ACPA Extintores"
              className="quotation-logo"
              loading="eager"
              decoding="sync"
            />

          </div>

          <div className="quotation-business">
            <strong>{settings.businessName}</strong>

            <p>{settings.activity}</p>

            <p>
              {settings.addressLines.join(' · ')}
            </p>

            <p className="quotation-business-contact">
              <span>Tel. {settings.phone}</span>
              <span>{settings.email}</span>
              <span>RFC: {settings.rfc}</span>
            </p>
          </div>

          <div className="quotation-title">
            <h1>{documentTitle}</h1>

            <dl>
              <div>
                <dt>No.</dt>
                <dd>{folioDisplay}</dd>
              </div>

              <div>
                <dt>Fecha</dt>
                <dd>
                  {DATE_FORMATTER.format(
                    quotationDate,
                  )}
                </dd>
              </div>

              {!registeredNote && (
                <div>
                  <dt>Vigencia</dt>
                  <dd>{QUOTATION_VALIDITY}</dd>
                </div>
              )}
            </dl>
          </div>
        </header>

        <section className="quotation-client-card">
          <div className="quotation-client-name">
            <span className="quotation-client-label">
              {registeredNote ? 'Cliente' : 'Cotizar a'}
            </span>

            <strong>{getClientName(client)}</strong>

            {client.type === 'company' &&
              client.contactName && (
                <p>
                  Contacto: {client.contactName}
                </p>
              )}
          </div>

          <div className="quotation-client-details">
            {client.phone && (
              <span>Tel. {client.phone}</span>
            )}

            {client.email && (
              <span>{client.email}</span>
            )}

            {client.address && (
              <span>{client.address}</span>
            )}

            <span>
              {getClientServiceArea(client)}
            </span>
          </div>
        </section>

        <p className="quotation-introduction">
  {registeredNote
    ? 'Nota de venta correspondiente a los equipos y servicios detallados.'
    : settings.introduction}
</p>

        <table className="quotation-items">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Características</th>
              <th>Cantidad</th>
              <th>Precio unitario</th>
              <th>Importe</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{getItemDescription(item)}</td>
                <td>
                  {getItemCharacteristics(item)}
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
              </tr>
            ))}
          </tbody>
        </table>

        <p className="quotation-disclaimer">
          {settings.imageDisclaimer}
        </p>

        <section className="quotation-summary">
          <div className="quotation-terms">
            <h2>Condiciones comerciales</h2>

            <dl>
                {!registeredNote && (
                  <div>
                    <dt>Vigencia</dt>
                    <dd>{QUOTATION_VALIDITY}</dd>
                  </div>
                )}
              <div>
                <dt>Tiempo de entrega</dt>
                <dd>{terms.deliveryTime}</dd>
              </div>

              {formattedDeliveryDate && (
                <div>
                  <dt>Entrega programada</dt>
                  <dd>{formattedDeliveryDate}</dd>
                </div>
              )}

              <div>
                <dt>Garantía</dt>
                <dd>{terms.warranty}</dd>
              </div>

              {terms.additionalCondition && (
                <div>
                  <dt>Condición adicional</dt>
                  <dd>
                    {terms.additionalCondition}
                  </dd>
                </div>
              )}
            </dl>

            {terms.clauses.length > 0 && (
              <ul>
                {terms.clauses.map((clause) => (
                  <li key={clause}>{clause}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="quotation-totals">
            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>
                  {formatMoneyFromCents(
                    amounts.subtotalCents,
                  )}
                </dd>
              </div>

              {amounts.applyVat && (
                <div>
                  <dt>IVA 16%</dt>
                  <dd>
                    {formatMoneyFromCents(
                      amounts.vatAmountCents,
                    )}
                  </dd>
                </div>
              )}

              {amounts.applyResicoWithholding && (
                <div>
                  <dt>Retención ISR 1.25%</dt>
                  <dd>
                    −{' '}
                    {formatMoneyFromCents(
                      amounts.resicoAmountCents,
                    )}
                  </dd>
                </div>
              )}

              <div className="quotation-total">
                <dt>Total</dt>
                <dd>
                  {formatMoneyFromCents(
                    amounts.totalCents,
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="quotation-amount-words">

          <strong>Cantidad con letra:</strong>
          <span>
            {formatAmountInWords(
              amounts.totalCents,
            )}
          </span>
        </section>
        {registeredNote && (
          <>
            <section className="quotation-note-status">
              <div>
                <span>Documento</span>
                <strong>
                  {
                    DOCUMENT_STATUS_LABELS[
                      registeredNote.documentStatus
                    ]
                  }
                </strong>
              </div>

              <div>
                <span>Estado de pago</span>
                <strong>
                  {
                    PAYMENT_STATUS_LABELS[
                      registeredNote.paymentStatus
                    ]
                  }
                </strong>
              </div>

              <div>
                <span>Pagado</span>
                <strong>
                  {formatMoneyFromCents(
                    registeredNote.paidCents,
                  )}
                </strong>
              </div>

              <div>
                <span>Saldo pendiente</span>
                <strong>
                  {formatMoneyFromCents(
                    registeredNote.balanceCents,
                  )}
                </strong>
              </div>

              <div>
                <span>Entrega</span>
                <strong>
                  {registeredNote.delivery.status ===
                  'delivered'
                    ? 'Entregada'
                    : 'Pendiente'}
                </strong>
              </div>

              <div>
                <span>Fecha real de entrega</span>
                <strong>
                  {deliveredAt ?? 'No registrada'}
                </strong>
              </div>
            </section>

            <section className="quotation-payments">
              <h2>Pagos registrados</h2>

              {registeredNote.payments.length === 0 ? (
                <p>No se han registrado pagos.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Método</th>
                      <th>Importe</th>
                    </tr>
                  </thead>

                  <tbody>
                    {registeredNote.payments.map(
                      (payment) => (
                        <tr key={payment.id}>
                          <td>
                            {DATE_TIME_FORMATTER.format(
                              payment.paidAt.toDate(),
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
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              )}
            </section>

            {registeredNote.cancellation && (
              <section className="quotation-cancellation">
                <h2>Cancelación</h2>

                <p>
                  <strong>Motivo:</strong>{' '}
                  {registeredNote.cancellation.reason}
                </p>

                <p>
                  <strong>Fecha:</strong>{' '}
                  {DATE_TIME_FORMATTER.format(
                    registeredNote.cancellation.cancelledAt.toDate(),
                  )}
                </p>
              </section>
            )}
          </>
        )}

        {notes.trim() && (
          <section className="quotation-notes">
            <h2>Observaciones</h2>
            <p>{notes.trim()}</p>
          </section>
        )}

        <section className="quotation-footer-data">
          <div className="quotation-bank">
            <h2>Datos bancarios</h2>
            <p>
              <strong>Banco:</strong>{' '}
              {settings.bank.name}
            </p>
            <p>
              <strong>Número de cuenta:</strong>{' '}
              {settings.bank.accountNumber}
            </p>
            <p>
              <strong>CLABE interbancaria:</strong>{' '}
              {settings.bank.clabe}
            </p>
          </div>

          <div className="quotation-signature">
            <p>
              {settings.representative.prefix}
            </p>
            <div
              className="quotation-signature-line"
              aria-hidden="true"
            />
            <strong>
              {settings.representative.name}
            </strong>
          </div>
        </section>

        <footer className="quotation-closing">
          <p>{settings.closing}</p>
          <strong>{settings.slogan}</strong>
        </footer>
      </div>
    </article>
  )
}