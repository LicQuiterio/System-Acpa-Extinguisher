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

type SalesQuotationPrintProps = {
  folioDisplay: string
  quotationDate: Date
  client: SalesClient
  items: SalesNoteItem[]
  amounts: SalesQuotationPrintAmounts
  scheduledDeliveryDate: string | null
  notes: string
  terms?: SalesNoteTerms
}

const DATE_FORMATTER = new Intl.DateTimeFormat(
  'es-MX',
  {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  },
)

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
  client: SalesClient,
): string {
  return client.type === 'company'
    ? client.companyName
    : client.contactName
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
  terms = DEFAULT_SALES_TERMS,
}: SalesQuotationPrintProps) {
  const settings = ACPA_QUOTATION_SETTINGS
  const formattedDeliveryDate =
    formatScheduledDate(scheduledDeliveryDate)

  return (
    <article
      className="quotation-print-area"
      aria-label={`Cotización ${folioDisplay}`}
    >
      <div className="quotation-sheet">
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
            <h1>Cotización</h1>
          
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
                
              <div>
                <dt>Vigencia</dt>
                <dd>{QUOTATION_VALIDITY}</dd>
              </div>
            </dl>
          </div>
        </header>
                
        <section className="quotation-client-card">
          <div className="quotation-client-name">
            <span className="quotation-client-label">
              Cotizar a
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
              {client.serviceAreaSnapshot.displayName}
            </span>
          </div>
        </section>

        <p className="quotation-introduction">
          {settings.introduction}
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
              <div>
                <dt>Vigencia</dt>
                <dd>{QUOTATION_VALIDITY}</dd>
              </div>

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