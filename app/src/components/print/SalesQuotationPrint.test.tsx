import { renderToStaticMarkup } from 'react-dom/server'
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import type { CustomerSnapshot } from '../../types/salesNote'
import type { SalesNoteLoan } from '../../types/salesNoteLoan'
import { SalesQuotationPrint } from './SalesQuotationPrint'

const client: CustomerSnapshot = {
  type: 'company',
  companyName: 'Cliente de prueba',
  contactName: 'Contacto',
  phone: '',
  email: '',
  address: '',
  serviceAreaId: 'area-1',
  municipality:
    'Municipio de prueba' as CustomerSnapshot['municipality'],
  locality: 'Localidad de prueba',
  serviceAreaDisplayName: 'Localidad de prueba',
}

const activeLoan: SalesNoteLoan = {
  id: 'loan-active',
  equipmentCode: 'ACPA-P-001',
  normalizedEquipmentCode: 'ACPA-P-001',
  reason: 'recharge',
  agent: 'pqs',
  capacityValue: 4.5,
  capacityUnit: 'kg',
  outgoingCondition: 'Equipo completo y funcional',
  status: 'active',
  loanedAt: Timestamp.fromDate(
    new Date('2026-07-30T16:00:00-06:00'),
  ),
  loanedBy: 'user-1',
  returnedAt: null,
  returnedBy: null,
  returnNotes: '',
}

const returnedLoan: SalesNoteLoan = {
  ...activeLoan,
  id: 'loan-returned',
  equipmentCode: 'ACPA-P-002',
  normalizedEquipmentCode: 'ACPA-P-002',
  status: 'returned',
  returnedAt: Timestamp.fromDate(
    new Date('2026-07-31T10:00:00-06:00'),
  ),
  returnedBy: 'user-2',
  returnNotes: 'Regresó en buenas condiciones',
}

function renderRegisteredNote(
  loans: SalesNoteLoan[],
): string {
  return renderToStaticMarkup(
    <SalesQuotationPrint
      folioDisplay="09600"
      quotationDate={new Date('2026-07-30')}
      client={client}
      items={[]}
      amounts={{
        subtotalCents: 0,
        applyVat: false,
        vatAmountCents: 0,
        applyResicoWithholding: false,
        resicoAmountCents: 0,
        totalCents: 0,
      }}
      scheduledDeliveryDate={null}
      notes=""
      registeredNote={{
        documentStatus: 'issued',
        paymentStatus: 'unpaid',
        paidCents: 0,
        balanceCents: 0,
        payments: [],
        delivery: {
          status: 'pending',
          scheduledDate: null,
          deliveredAt: null,
          deliveredBy: null,
          isLegacy: false,
        },
        cancellation: null,
        loans,
      }}
    />,
  )
}

describe('SalesQuotationPrint préstamos', () => {
  it('omite la sección cuando la nota no tiene préstamos', () => {
    const markup = renderRegisteredNote([])

    expect(markup).not.toContain(
      'Extintores en préstamo',
    )
  })

  it('imprime préstamos activos y devueltos con su estado actual', () => {
    const markup = renderRegisteredNote([
      activeLoan,
      returnedLoan,
    ])

    expect(markup).toContain('Extintores en préstamo')
    expect(markup).toContain('ACPA-P-001')
    expect(markup).toContain('ACPA-P-002')
    expect(markup).toContain('Préstamo por recarga')
    expect(markup).toContain('PQS · 4.5 kg')
    expect(markup).toContain(
      'Equipo completo y funcional',
    )
    expect(markup).toContain('Prestado')
    expect(markup).toContain('Devuelto')
    expect(markup).toContain('Pendiente')
    expect(markup).toContain(
      'Equipo propiedad de ACPA Extintores',
    )
  })
})
